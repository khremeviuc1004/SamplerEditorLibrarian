use std::{time::{Duration}, collections::{HashMap, VecDeque}, sync::{Arc, Mutex}, fmt::Debug};

use fundsp::{hacker32::{square_hz, triangle_hz, sine_hz, pulse, saw_hz, U1}, prelude::{An, Pipe, Constant, Sine, PulseWave}, wavetable::WaveSynth};
use itertools::Itertools;
use midir::{MidiInput, MidiOutput, MidiOutputConnection, MidiInputConnection, MidiInputPort, MidiOutputPort};
use neon::prelude::*;
use crossbeam_channel::{Receiver, Sender, unbounded};
use flexi_logger::Logger;
use log::*;

#[macro_use]
extern crate lazy_static;

const SAMPLER_CHAR_MAP: [char; 41] = [ 
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
    ' ', 
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 
    '*', '+', '-', '.'
];

const START_OF_SYSTEM_EXCLUSIVE: u8 = 240;
const EOX: u8 = 247; // end of system exclusive message
const SAMPLER_MANUFACTURER_CODE: u8 = 0x47;
const SAMPLER_IDENTITY: u8 = 0x48;

const SYSEX_NON_REAL_TIME_CATEGORY: u8 = 0x7E;
const SAMPLE_DUMP_STANDARD_DATA_PACKET: u8 = 0x02;
const SAMPLE_DUMP_STANDARD_DATA_ACK: u8 = 0x7F;

const NUMBER_OF_MIDI_EVENTS_TO_READ: usize = 100000;

const RECEIVE_TIMEOUT: Duration = Duration::from_secs(2);

const AKAI_HEADER_SIZE_IN_BYTES: u16 = 192;
const U16_LSB_TO_AKAI_U8_MASK: u16 = 127;
const U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT: u16 = 7;
const U32_LSB_TO_AKAI_U8_MASK: u32 = 127;
const U32_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT: u32 = 7;
const NAME_ENTRY_SIZE_IN_BYTES: u16 = 12;
const CUE_LIST_SIZE_IN_BYTES: u16 = 128;
const TAKE_LIST_SIZE_IN_BYTES: u16 = 128;

struct Oscillator {
    square: An<Pipe<f32, Constant<U1, f32>, WaveSynth<'static, f32, U1>>>,
    triangle: An<Pipe<f32, Constant<U1, f32>, WaveSynth<'static, f32, U1>>>,
    saw: An<Pipe<f32, Constant<U1, f32>, WaveSynth<'static, f32, U1>>>,
    sine: An<Pipe<f32, Constant<U1, f32>, Sine<f32>>>,
    pulse: An<PulseWave<f32>>,
    template: String,
}

impl Oscillator {
    fn new(frequency: f32, template: String) -> Self {
        let mut pulse = pulse();

        // need to set the frequency ofr the pulse

        Self {
            square: square_hz(frequency),
            triangle: triangle_hz(frequency),
            saw: saw_hz(frequency),
            sine: sine_hz(frequency),
            pulse,
            template,
        }
    }

    fn next_sample(&mut self) -> i16 {
        if self.template == "square" {
            (self.square.get_mono() * 65534.0 - 32767.0) as i16
        }
        else if self.template == "triangle" {
            (self.triangle.get_mono() * 65534.0 - 32767.0) as i16
        }
        else if self.template == "saw" {
            (self.saw.get_mono() * 65534.0 - 32767.0) as i16
        }
        else if self.template == "pulse" {
            (self.pulse.get_mono() * 65534.0 - 32767.0) as i16
        }
        else {
            (self.sine.get_mono() * 65534.0 - 32767.0) as i16
        }
    }
}

enum S1000SysexFunctionCodes {
    RSTAT,	// <	request S1000 status
    STAT,	// >	S1000 status report
    RPLIST,	// >	request list of resident program names
    PLIST,	// >	list of resident program names
    RSLIST,	// <	request list of resident sample names
    SLIST, 	// > 	list of resident sample names
    RPDATA, 	// < 	request program common data
    PDATA, 	// <> 	program common data
    RKDATA, 	// < 	request keygroup data
    KDATA, 	// <> 	keygroup data
    RSDATA, 	// < 	request sample header data
    SDATA, 	// <> 	sample header data
    RSPACK, 	// < 	request sample data packet(s)
    ASPACK, 	// < 	accept sample data packet(s)
    RDDATA, 	// < 	request drum settings
    DDATA, 	// <> 	drum input settings
    RMDATA, 	// < 	request miscellaneous data
    MDATA, 	// <> 	miscellaneous data
    DELP, 	// < 	delete program and its keygroup
    DELK, 	// < 	delete keygroup
    DELS, 	// < 	delete sample header and data
    SETEX, 	// < 	set S1000 exclusive channel
    REPLY, 	// > 	S1000 command reply (error or ok)
    CASPACK, // < 	corrected ASPACK
}

enum S3000SysexFunctionCodes {
    RequestProgramHeader = 0x27,
    ResponseProgramHeader = 0x28,
    RequestKeygroupHeader = 0x29,
    ResponseKeygroupHeader = 0x2A,
    RequestSampleHeader = 0x2B,
    ResponseSampleHeader = 0x2C,
    RequestFXReverb = 0x2D,
    ResponseFXReverb = 0x2E,
    RequestCueList = 0x2F,
    ResponseCueList = 0x30,
    RequestTakeList = 0x31,
    ResponseTakeList = 0x32,
    RequestMiscellaneous = 0x33,
    ResponseMiscellaneous = 0x34,
    RequestVolumeListItem = 0x35,
    ResponseVolumeListItem = 0x36,
    RequestHardDiskDirectoryEntry = 0x37,
    ResponseHardDiskDirectoryEntry = 0x38,
}

#[derive(Clone)]
enum IncomingSamplerEvent {
    RequestProgramHeader(u16),
    RequestKeygroupHeader(u16, u8),
    RequestSampleHeader(u16),
    RequestSampleData(u16, u32),
    RequestFXReverb(u16, u8),
    RequestCueList(u16, u8),
    RequestTakeList(u16, u8),
    RequestMiscellaneousBytes(u16, u8),
    RequestVolumeList(u16),
    RequestHardDiskDirEntry(u16, u8),
    RequestResidentProgramNames,
    RequestResidentSampleNames,
    StatusReport,
    DeleteProgram(u16),
    DeleteKeygroup(u16, u8),
    DeleteSample(u16),
    NewProgram(u16, Vec<u8>),
    NewKeygroup(u16, u8, Vec<u8>),
    NewSampleFromTemplate(u16, String, Vec<u8>),
    NewSample(u16),
    RequestS1000MiscellaneousData,
    ChangeProgramHeader(u8, u8, Vec<u8>), // program_number, offset into header, vector of changed byte data
    ChangeKeyGroupHeader(u8, u8, u8, Vec<u8>), // program_number, keygroup number, offset into header, vector of changed byte data
    ChangeSampleHeader(u8, u8, Vec<u8>), // sample_number, offset into header, vector of changed byte data
}

#[derive(Clone)]
enum OutgoingSamplerEvent {
    ProgramHeader(Vec<u8>),
    KeygroupHeader(Vec<u8>),
    SampleHeader(Vec<u8>),
    FXReverb,
    CueList,
    TakeList,
    MiscellaneousBytes,
    VolumeList(String, Option<String>),
    HardDiskDirEntry(String, Option<String>),
    ResidentProgramNames(Vec<String>, Option<String>),
    ResidentSampleNames(Vec<String>, Option<String>),
    StatusReport(HashMap<String, i32>, Option<String>),
    S1000MiscellaneousData(HashMap<String, i32>, Option<String>),
    S1000CommandReply(bool),
    SampleData(Vec<u16>),
}

#[derive(Clone)]
enum IncomingEvent {
    GetInputPorts,
    GetOutputPorts,
    ConnectToOutputPort(i32),
    ConnectToInputPort(i32),
    GetConnections,
    SamplerEvent(IncomingSamplerEvent),
    Close,
}

#[derive(Clone)]
struct IncomingCommChannels {
    tx: Sender<IncomingEvent>,
    rx: Receiver<IncomingEvent>,
}

lazy_static! {
    static ref INCOMING_COMM_CHANNELS: IncomingCommChannels = {
        let (tx, rx) = unbounded::<IncomingEvent>();
        IncomingCommChannels { tx, rx }
    };
}

#[derive(Clone)]
enum OutgoingEvent {
    InputPorts(HashMap<i32, String>),
    OutputPorts(HashMap<i32, String>),
    ConnectToOutputPortResult(bool),
    ConnectToInputPortResult(bool),
    Connections(Vec<(i32, String, bool)>),
    SamplerEvent(OutgoingSamplerEvent),
}

#[derive(Clone)]
struct OutgoingCommChannels {
    tx: Sender<OutgoingEvent>,
    rx: Receiver<OutgoingEvent>,
}

lazy_static! {
    static ref OUT_GOING_COMM_CHANNELS: OutgoingCommChannels = {
        let (tx, rx) = unbounded::<OutgoingEvent>();
        OutgoingCommChannels { tx, rx }
    };
}

#[derive(Clone)]
struct SysexChannel {
    tx: Sender<Vec<u8>>,
    rx: Receiver<Vec<u8>>,
}

lazy_static! {
    static ref SYSEX_COMM_CHANNEL: SysexChannel = {
        let (tx, rx) = unbounded::<Vec<u8>>();
        SysexChannel { tx, rx }
    };
}

fn extract_names_from_list_sysex(message: & Vec<u8>) -> Vec<String> {
    let mut number_of_items: u16 = 0;
    let mut item_names = vec![];
    let mut current_item_name = vec![];

    for (index, sysex_byte) in message.iter().enumerate() {
        if index == 5 {
            number_of_items = *sysex_byte as u16;
        }
        else if index == 6  {
            number_of_items |= (*sysex_byte as u16) << 8;

            info!("Number of items in list: {}", number_of_items);
        }
        else if index > 6 {
            current_item_name.push(*sysex_byte);

            if current_item_name.len() == 12 {
                let converted_program_name = convert_sampler_sysex_name_to_name(&current_item_name);
                item_names.push(converted_program_name);
                current_item_name.clear();
            }
        }
    }

    item_names
}

trait SampleSysexMessageHandler {
    fn can_handle(&self, message: &Vec<u8>) -> bool;
    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>);
    fn name(&self) -> String;
}

struct SampleSysexResidentSamplesMessageHandler;

impl SampleSysexMessageHandler for SampleSysexResidentSamplesMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S1000SysexFunctionCodes::SLIST as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::ResidentSampleNames(extract_names_from_list_sysex(message), None)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexResidentSamplesMessageHandler")
    }
}

struct SampleSysexResidentProgramsMessageHandler;

impl SampleSysexMessageHandler for SampleSysexResidentProgramsMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S1000SysexFunctionCodes::PLIST as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::ResidentProgramNames(extract_names_from_list_sysex(message), None)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexResidentProgramsMessageHandler")
    }
}

struct SampleSysexVolumeListMessageHandler;

impl SampleSysexMessageHandler for SampleSysexVolumeListMessageHandler {
    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S3000SysexFunctionCodes::ResponseVolumeListItem as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let entry_number_data = &message[5..7];
        let entry_number = entry_number_data[0] | (entry_number_data[1] << 4);

        info!("message length={}, entry_number={}", message.len(), entry_number);
        
        let range_start = 12;
        let range_end = range_start + 24;
        let record = &message[range_start..range_end];

        let mut string_buf = format!("range_start={}, range_end={} - ", range_start, range_end);
        let mut unnibbled_record = vec![];
        let mut unnibbled_value: u8 = 0;
        for (nibble_index, nibble) in record.iter().enumerate() {
            string_buf.push_str(format!("{}, ", nibble).as_str());

            if nibble_index % 2 == 0 {
                unnibbled_value = *nibble;
            }
            else {
                unnibbled_record.push(unnibbled_value | (*nibble << 4));
            }
        }
        info!("{}", string_buf.as_str());

        string_buf.clear();
        string_buf.push_str("Unnibbled: ");
        for value in unnibbled_record.iter() {
            string_buf.push_str(format!("{}, ", value).as_str());
        }
        info!("{}", string_buf.as_str());

        let name = convert_sampler_sysex_name_to_name(&unnibbled_record);
        info!("{}", name.as_str());

        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::VolumeList(name, None)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexVolumeListMessageHandler")
    }
}

struct SampleSysexMiscellaneousBytesMessageHandler;

impl SampleSysexMessageHandler for SampleSysexMiscellaneousBytesMessageHandler {
    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S3000SysexFunctionCodes::ResponseMiscellaneous as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let data_index_data = &message[5..7];
        let data_number = data_index_data[0] | (data_index_data[1] << 4);

        info!("message length={}, data_number={}", message.len(), data_number);
        
        let range_start = 12;
        let range_end = range_start + 24;
        let record = &message[range_start..range_end];

        let mut string_buf = format!("range_start={}, range_end={} - ", range_start, range_end);
        let mut unnibbled_record = vec![];
        let mut unnibbled_value: u8 = 0;
        for (nibble_index, nibble) in record.iter().enumerate() {
            string_buf.push_str(format!("{}, ", nibble).as_str());

            if nibble_index % 2 == 0 {
                unnibbled_value = *nibble;
            }
            else {
                unnibbled_record.push(unnibbled_value | (*nibble << 4));
            }
        }
        info!("{}", string_buf.as_str());

        string_buf.clear();
        string_buf.push_str("Unnibbled: ");
        for value in unnibbled_record.iter() {
            string_buf.push_str(format!("{}, ", value).as_str());
        }
        info!("{}", string_buf.as_str());

        let name = convert_sampler_sysex_name_to_name(&unnibbled_record);
        info!("{}", name.as_str());

        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::VolumeList(name, None)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexMiscellaneousBytesMessageHandler")
    }
}

struct SampleSysexHardDiskDirectoryEntryMessageHandler;

impl SampleSysexMessageHandler for SampleSysexHardDiskDirectoryEntryMessageHandler {
    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S3000SysexFunctionCodes::ResponseHardDiskDirectoryEntry as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            // else if (index + 1) == message.len() && *sysex_byte != EOX  {
            //     info!("{}: Sysex is not terminated properly.", self.name());
            //     return false
            // }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let entry_number_data = &message[5..7];
        let entry_number = entry_number_data[0] | (entry_number_data[1] << 4);
        let selector = message[7];

        info!("message length={}, entry_number={}, selector={}", message.len(), entry_number, selector);
        
        let range_start = 12;
        let range_end = range_start + 48;
        let record = &message[range_start..range_end];

        let mut string_buf = format!("range_start={}, range_end={} - ", range_start, range_end);
        let mut unnibbled_record = vec![];
        let mut unnibbled_value: u8 = 0;
        for (nibble_index, nibble) in record.iter().enumerate() {
            string_buf.push_str(format!("{}, ", nibble).as_str());

            if nibble_index % 2 == 0 {
                unnibbled_value = *nibble;
            }
            else {
                unnibbled_record.push(unnibbled_value | (*nibble << 4));
            }
        }
        info!("{}", string_buf.as_str());

        string_buf.clear();
        string_buf.push_str("Unnibbled: ");
        for value in unnibbled_record.iter() {
            string_buf.push_str(format!("{}, ", value).as_str());
        }
        info!("{}", string_buf.as_str());

        if selector > 0 {
            let name = convert_sampler_sysex_name_to_name(&unnibbled_record);
            info!("{}", name.as_str());    
            let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::HardDiskDirEntry(name, None)));
        }
        else {
            let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::HardDiskDirEntry("".to_string(), Some("Selector was less than 0".to_string()))));
        }
    }

    fn name(&self) -> String {
        String::from("SampleSysexHardDiskDirectoryEntryMessageHandler")
    }
}

struct SampleSysexStatusReportMessageHandler;

impl SampleSysexMessageHandler for SampleSysexStatusReportMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S1000SysexFunctionCodes::STAT as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let mut data = HashMap::new();
        let mut max_blocks = 0;
        let mut free_blocks = 0;
        let mut max_sample_words: u32 = 0;
        let mut free_words: u32 = 0;

        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 5 {
                data.insert("software_version_minor".to_string(), *sysex_byte as i32);
            }
            else if index == 6 {
                data.insert("software_version_major".to_string(), *sysex_byte as i32);
            }
            else if index == 7 {
                max_blocks = *sysex_byte as u16;
            }
            else if index == 8 {
                data.insert("max_blocks".to_string(),  (((*sysex_byte as u16) << 7) | max_blocks) as i32);
            }
            else if index == 9 {
                free_blocks = *sysex_byte as u16;
            }
            else if index == 10 {
                data.insert("free_blocks".to_string(), (((*sysex_byte as u16) << 7) | free_blocks) as i32);
            }
            else if index == 11 {
                max_sample_words = *sysex_byte as u32;
            }
            else if index == 12 {
                max_sample_words = max_sample_words | ((*sysex_byte as u32) << 7);
            }
            else if index == 13 {
                max_sample_words = max_sample_words | ((*sysex_byte as u32) << 14);
            }
            else if index == 14 {
                max_sample_words = max_sample_words | ((*sysex_byte as u32) << 21);
                data.insert("max_sample_words".to_string(), max_sample_words as i32);
            }
            else if index == 15 {
                free_words = *sysex_byte as u32;
            }
            else if index == 16 {
                free_words = free_words | ((*sysex_byte as u32) << 7);
            }
            else if index == 17 {
                free_words = free_words | ((*sysex_byte as u32) << 14);
            }
            else if index == 18 {
                free_words = free_words | ((*sysex_byte as u32) << 21);
                data.insert("free_words".to_string(), free_words as i32);
            }
            else if index == 19 {
                data.insert("exclusive_channel".to_string(), *sysex_byte as i32);
            }
        }
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::StatusReport(data, None)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexStatusReportMessageHandler")
    }
}

struct SampleSysexS1000MiscellaneousDataMessageHandler;

impl SampleSysexMessageHandler for SampleSysexS1000MiscellaneousDataMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S1000SysexFunctionCodes::MDATA as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let mut data = HashMap::new();
        let mut basic_midi_channel = 0;
        let mut basic_channel_omni = 0;
        let mut midi_program_select_enable = 0;
        let mut selected_program_number = 0;
        let mut midi_play_commands_omni_override = 0;

        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 5 {
                basic_midi_channel = *sysex_byte;
            }
            else if index == 6 {
                data.insert("basic_midi_channel".to_string(),  (((*sysex_byte) << 4) | basic_midi_channel) as i32);
            }
            else if index == 7 {
                basic_channel_omni = *sysex_byte;
            }
            else if index == 8 {
                data.insert("basic_channel_omni".to_string(), (((*sysex_byte) << 4) | basic_channel_omni) as i32);
            }
            else if index == 9 {
                midi_program_select_enable = *sysex_byte;
            }
            else if index == 10 {
                data.insert("midi_program_select_enable".to_string(), (((*sysex_byte) << 4) | midi_program_select_enable) as i32);
            }
            else if index == 11 {
                selected_program_number = *sysex_byte;
            }
            else if index == 12 {
                data.insert("selected_program_number".to_string(), (((*sysex_byte) << 4) | selected_program_number) as i32);
            }
            else if index == 13 {
                midi_play_commands_omni_override = *sysex_byte;
            }
            else if index == 14 {
                data.insert("midi_play_commands_omni_override".to_string(), (((*sysex_byte) << 4) | midi_play_commands_omni_override) as i32);
            }
        }
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::S1000MiscellaneousData(data, None)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexS1000MiscellaneousDataMessageHandler")
    }
}

struct SampleSysexS1000CommandReplyMessageHandler;

impl SampleSysexMessageHandler for SampleSysexS1000CommandReplyMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S1000SysexFunctionCodes::REPLY as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        if let Some(success) = message.get(5) {
            if *success == 0 {
                let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::S1000CommandReply(true)));
                return;
            }
        }
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::S1000CommandReply(false)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexS1000CommandReplyMessageHandler")
    }
}

struct SampleSysexProgramHeaderMessageHandler;

impl SampleSysexMessageHandler for SampleSysexProgramHeaderMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S3000SysexFunctionCodes::ResponseProgramHeader as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let number_of_bytes_of_data = &message[10..12];
        let number_of_bytes_of_data = number_of_bytes_of_data[0] as u16 | ((number_of_bytes_of_data[1] as u16) << 7);

        info!("message length={}, number_of_bytes_of_data={}", message.len(), number_of_bytes_of_data);
        
        let range_start = 12 as usize;
        let range_end = range_start + ((number_of_bytes_of_data * 2) as usize) + 1;
        let record = &message[range_start..range_end];

        let mut unnibbled_record = vec![];
        let mut unnibbled_value: u8 = 0;
        for (nibble_index, nibble) in record.iter().enumerate() {
            if nibble_index % 2 == 0 {
                unnibbled_value = *nibble;
            }
            else {
                unnibbled_record.push(unnibbled_value | (*nibble << 4));
            }
        }

        info!("unnibbled_record length={}", unnibbled_record.len());
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::ProgramHeader(unnibbled_record)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexProgramHeaderMessageHandler")
    }
}

struct SampleSysexKeyGroupHeaderMessageHandler;

impl SampleSysexMessageHandler for SampleSysexKeyGroupHeaderMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S3000SysexFunctionCodes::ResponseKeygroupHeader as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let number_of_bytes_of_data = &message[10..12];
        let number_of_bytes_of_data = number_of_bytes_of_data[0] as u16 | ((number_of_bytes_of_data[1] as u16) << 7);

        info!("message length={}, number_of_bytes_of_data={}", message.len(), number_of_bytes_of_data);
        
        let range_start = 12 as usize;
        let range_end = range_start + ((number_of_bytes_of_data * 2) as usize) + 1;
        let record = &message[range_start..range_end];

        let mut unnibbled_record = vec![];
        let mut unnibbled_value: u8 = 0;
        for (nibble_index, nibble) in record.iter().enumerate() {
            if nibble_index % 2 == 0 {
                unnibbled_value = *nibble;
            }
            else {
                unnibbled_record.push(unnibbled_value | (*nibble << 4));
            }
        }

        info!("unnibbled_record length={}", unnibbled_record.len());
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::KeygroupHeader(unnibbled_record)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexKeyGroupHeaderMessageHandler")
    }
}

struct SampleSysexSampleHeaderMessageHandler;

impl SampleSysexMessageHandler for SampleSysexSampleHeaderMessageHandler {

    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SAMPLER_MANUFACTURER_CODE {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != S3000SysexFunctionCodes::ResponseSampleHeader as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 4 && *sysex_byte != SAMPLER_IDENTITY {
                info!("{}: Sysex sampler identity incorrect.", self.name());
                return false
            }
            else if (index + 1) == message.len() && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        let number_of_bytes_of_data = &message[10..12];
        let number_of_bytes_of_data = number_of_bytes_of_data[0] as u16 | ((number_of_bytes_of_data[1] as u16) << 7);

        info!("message length={}, number_of_bytes_of_data={}", message.len(), number_of_bytes_of_data);
        
        let range_start = 12 as usize;
        let range_end = range_start + ((number_of_bytes_of_data * 2) as usize) + 1;
        let record = &message[range_start..range_end];

        let mut unnibbled_record = vec![];
        let mut unnibbled_value: u8 = 0;
        for (nibble_index, nibble) in record.iter().enumerate() {
            if nibble_index % 2 == 0 {
                unnibbled_value = *nibble;
            }
            else {
                unnibbled_record.push(unnibbled_value | (*nibble << 4));
            }
        }

        info!("unnibbled_record length={}", unnibbled_record.len());
        let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::SampleHeader(unnibbled_record)));
    }

    fn name(&self) -> String {
        String::from("SampleSysexSampleHeaderMessageHandler")
    }
}

struct SampleSysexSampleDumpAckMessageHandler {
    sample_dump_packets: Arc<Mutex<VecDeque<Vec<u8>>>>,
    sysex_to_sampler_queue: Arc<Mutex<VecDeque<Vec<u8>>>>,
}

impl SampleSysexSampleDumpAckMessageHandler {
    fn new(sample_dump_packets: Arc<Mutex<VecDeque<Vec<u8>>>>, sysex_to_sampler_queue: Arc<Mutex<VecDeque<Vec<u8>>>>) -> Self {
        Self {
            sample_dump_packets,
            sysex_to_sampler_queue,
        }
    }
}

impl SampleSysexMessageHandler for SampleSysexSampleDumpAckMessageHandler {
    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SYSEX_NON_REAL_TIME_CATEGORY {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != SAMPLE_DUMP_STANDARD_DATA_ACK as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == 5 && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        info!("SampleSysexSampleDumpAckMessageHandler: attempting to lock sample_dump_packets and sysex_to_sampler_queue...");
        if let Ok(mut sample_dump_packets) = self.sample_dump_packets.lock() {
            info!("SampleSysexSampleDumpAckMessageHandler: locked sample_dump_packets.");
            if let Some(packet) = sample_dump_packets.pop_front() {
                info!("SampleSysexSampleDumpAckMessageHandler: popped a sample dump packet.");
                // send the packet
                if let Ok(mut sysex_to_sampler_queue) = self.sysex_to_sampler_queue.lock() {
                    info!("SampleSysexSampleDumpAckMessageHandler: locked sysex_to_sampler_queue.");
                    info!("SampleSysexSampleDumpAckMessageHandler: Adding sample_dump_packet to sysex_to_sampler_queue.");
                    sysex_to_sampler_queue.push_back(packet);
                }
            }
        }
    }

    fn name(&self) -> String {
        String::from("SampleSysexSampleDumpAckMessageHandler")
    }
}

struct SampleSysexSampleDumpPacketMessageHandler {
    sample_dump_data_packet_count: i32,
    expected_sample_dump_data_packet_count: i32,
    sample_data: Vec<u16>,
}

impl SampleSysexSampleDumpPacketMessageHandler {
    pub fn new() -> Self {
        Self {
            sample_dump_data_packet_count: 0,
            expected_sample_dump_data_packet_count: 0,
            sample_data: vec![],
        }
    }

    fn set_expected_sample_dump_data_packet_count(&mut self, expected_sample_dump_data_packet_count: i32) {
        self.expected_sample_dump_data_packet_count = expected_sample_dump_data_packet_count;
    }

    fn handle_mut(&mut self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
        info!("SampleSysexSampleDumpPacketMessageHandler: handling sample dump packet...: expected_sample_dump_data_packet_count={}, sample_dump_data_packet_count={}", 
            self.expected_sample_dump_data_packet_count,
            self.sample_dump_data_packet_count
        );

        
        if self.expected_sample_dump_data_packet_count > 0 {
            // process the packet data
            self.sample_dump_data_packet_count += 1;
            let range = &message[5..(message.len() - 2)];
            
            // need to process 3 bytes at a time
            let mut running_value = 0;
            for (index, value) in range.iter().enumerate() {
                let remainder = index % 3;

                if remainder == 0 {
                    running_value |=  *value as u16;
                }
                else if remainder == 1 {
                    running_value |=  (*value as u16) <<  7;
                }
                else if remainder == 2 {
                    running_value |=  (*value as u16) << 14;
                    self.sample_data.push(running_value);
                    running_value = 0;
                }

            }

            if self.expected_sample_dump_data_packet_count == self.sample_dump_data_packet_count {
                // send a message to the client
                let _ = sender.send(OutgoingEvent::SamplerEvent(OutgoingSamplerEvent::SampleData(self.sample_data.clone())));
                
                self.sample_dump_data_packet_count = 0;
                self.expected_sample_dump_data_packet_count = 0;
                self.sample_data.clear();
            }
        }
    }
}

impl SampleSysexMessageHandler for SampleSysexSampleDumpPacketMessageHandler {
    fn can_handle(&self, message: &Vec<u8>) -> bool {
        for (index, sysex_byte) in message.iter().enumerate() {
            if index == 0 && *sysex_byte != START_OF_SYSTEM_EXCLUSIVE {
                info!("{}: Start of sysex incorrect.", self.name());
                return false
            }
            else if index == 1 && *sysex_byte != SYSEX_NON_REAL_TIME_CATEGORY {
                info!("{}: Sysex manufacturer incorrect.", self.name());
                return false
            }
            else if index == 3 && *sysex_byte != SAMPLE_DUMP_STANDARD_DATA_PACKET as u8 {
                info!("{}: Sysex function code incorrect.", self.name());
                return false
            }
            else if index == (message.len() - 1) && *sysex_byte != EOX  {
                info!("{}: Sysex is not terminated properly.", self.name());
                return false
            }
        }

        true
    }

    fn handle(&self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) {
    }

    fn name(&self) -> String {
        String::from("SampleSysexSampleDumpPacketMessageHandler")
    }
}

struct SampleSysexMessageProcessor {
    handlers: Vec<Box<dyn SampleSysexMessageHandler>>,
    sample_dump_packet_message_handler: SampleSysexSampleDumpPacketMessageHandler,
}

unsafe impl Send for SampleSysexMessageProcessor {

}

impl SampleSysexMessageProcessor {
    
    fn new() -> Self {
        let handlers: Vec<Box<dyn SampleSysexMessageHandler>> = vec![
            Box::new(SampleSysexResidentProgramsMessageHandler),
            Box::new(SampleSysexResidentSamplesMessageHandler),
            Box::new(SampleSysexStatusReportMessageHandler),
            Box::new(SampleSysexVolumeListMessageHandler),
            Box::new(SampleSysexHardDiskDirectoryEntryMessageHandler),
            Box::new(SampleSysexS1000MiscellaneousDataMessageHandler),
            Box::new(SampleSysexMiscellaneousBytesMessageHandler),
            Box::new(SampleSysexS1000CommandReplyMessageHandler),
            Box::new(SampleSysexProgramHeaderMessageHandler),
            Box::new(SampleSysexKeyGroupHeaderMessageHandler),
            Box::new(SampleSysexSampleHeaderMessageHandler),
        ];
        Self {
            handlers,
            sample_dump_packet_message_handler: SampleSysexSampleDumpPacketMessageHandler::new(),
        }
    }

    fn handle_message(&mut self, message: &Vec<u8>, sender: &Sender<OutgoingEvent>) -> bool {
        for handler in self.handlers.iter() {
            if handler.can_handle(message) {
                info!("Found sampler sysex message handler: {}", handler.name());
                handler.handle(message, sender);
                return true
            }
        }

        if self.sample_dump_packet_message_handler.can_handle(message) {
            info!("Found sampler sample dump data packet sysex message handler: {}", self.sample_dump_packet_message_handler.name());
            self.sample_dump_packet_message_handler.handle_mut(message, sender);
            return true
        }

        false
    }

    fn sample_dump_packet_message_handler(&self) -> &SampleSysexSampleDumpPacketMessageHandler {
        &self.sample_dump_packet_message_handler
    }

    fn sample_dump_packet_message_handler_mut(&mut self) -> &mut SampleSysexSampleDumpPacketMessageHandler {
        &mut self.sample_dump_packet_message_handler
    }
}

fn list_midi_input_ports(mut cx: FunctionContext) -> JsResult<JsArray> {
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::GetInputPorts);
    let midi_input_ports = cx.empty_array();
    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::InputPorts(input_ports) = msg {
            let mut index = 0;
            input_ports.keys().sorted().for_each(|key| {
                let row = cx.empty_object();
                let id = cx.number(key.clone());
                let name = cx.string(input_ports.get(key).unwrap().clone());
                let _ = row.set(&mut cx, "id", id);
                let _ = row.set(&mut cx, "name", name);
                let _ = midi_input_ports.set(&mut cx, index, row);
                index += 1;
            });
        }
    }

    Ok(midi_input_ports)
}

fn list_midi_output_ports(mut cx: FunctionContext) -> JsResult<JsArray> {
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::GetOutputPorts);
    let midi_output_ports = cx.empty_array();
    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::OutputPorts(output_ports) = msg {
            let mut index = 0;
            output_ports.keys().sorted().for_each(|key| {
                let row = cx.empty_object();
                let id = cx.number(key.clone());
                let name = cx.string(output_ports.get(key).unwrap().clone());
                let _ = row.set(&mut cx, "id", id);
                let _ = row.set(&mut cx, "name", name);
                let _ = midi_output_ports.set(&mut cx, index, row);
                index += 1;
            });
        }
    }

    Ok(midi_output_ports)
}

fn list_midi_connections(mut cx: FunctionContext) -> JsResult<JsArray> {
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::GetConnections);
    let midi_connections = cx.empty_array();
    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::Connections(connections) = msg {
            let mut index = 0;
            connections.iter().for_each(|(key, name, is_input)| {
                let row = cx.empty_object();
                let id = cx.number(key.clone());
                let name = cx.string(name.clone());
                let connection_type =  cx.boolean(is_input.clone());
                let _ = row.set(&mut cx, "id", id);
                let _ = row.set(&mut cx, "name", name);
                let _ = row.set(&mut cx, "is_input", connection_type);
                let _ = midi_connections.set(&mut cx, index, row);
                index += 1;
            });
        }
    }

    Ok(midi_connections)
}

fn connect_to_input_port(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered connect_to_input_port...");
    if let Ok(port_id) = cx.argument::<JsNumber>(0) {
        let id = port_id.value(&mut cx) as i32;
        info!("Attempting to connect to input: {}", id);
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::ConnectToInputPort(id));
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::ConnectToInputPortResult(connected) = msg {
                return Ok(cx.boolean(connected))
            }
        }
    }

    info!("Exiting connect_to_input_port...");
    Ok(cx.boolean(true))
}

fn connect_to_output_port(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered connect_to_output_port...");
    if let Ok(port_id) = cx.argument::<JsNumber>(0) {
        let id = port_id.value(&mut cx) as i32;
        info!("Attempting to connect to output: {}", id);
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::ConnectToOutputPort(id));
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::ConnectToOutputPortResult(connected) = msg {
                return Ok(cx.boolean(connected))
            }
        }
    }

    info!("Exiting connect_to_output_port...");
    Ok(cx.boolean(true))
}

fn sampler_delete_program(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_delete_program...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u16;
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::DeleteProgram(program_number)));
        
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                    return Ok(cx.boolean(success))
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_delete_keygroup(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_delete_keygroup...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u16;
        if let Ok(keygroup_number) = cx.argument::<JsNumber>(1) {
            let keygroup_number = keygroup_number.value(&mut cx) as u8;
            let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::DeleteKeygroup(program_number, keygroup_number)));
        
            if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                    if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                        return Ok(cx.boolean(success))
                    }
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_delete_sample(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_delete_sample...");
    if let Ok(sample_number) = cx.argument::<JsNumber>(0) {
        let sample_number = sample_number.value(&mut cx) as u16;
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::DeleteSample(sample_number)));
        
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                    return Ok(cx.boolean(success))
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_new_program(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_new_program...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u16;
        
        if let Ok(data) = cx.argument::<JsArray>(1) {
            let mut sysex_payload: Vec<u8> = vec![];

            if let Ok(result) = data.to_vec(&mut cx) {
                for (index, element) in result.iter().enumerate() {
                    if let Ok(value) = (*element).downcast::<JsNumber, CallContext<JsObject>>(&mut cx) {
                        sysex_payload.push(value.value(&mut cx) as u8);
                        info!("sampler_new_program: sysex_payload index={}, value={}", index, value.value(&mut cx) as u8);
                    }
                    else {
                        info!("sampler_new_program: failed to add value at sysex_payload index={}", index);
                    }
                }
            }

            info!("sampler_new_program: sysex_payload length={}", sysex_payload.len());
            
            if sysex_payload.len() == 192 {
                let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::NewProgram(program_number, sysex_payload)));
                if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                    if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                        if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                            return Ok(cx.boolean(success))
                        }
                    }
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_new_sample_from_template(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_new_sample_from_template...");
    if let Ok(sample_number) = cx.argument::<JsNumber>(0) {
        let sample_number = sample_number.value(&mut cx) as u16;
        
        if let Ok(template) = cx.argument::<JsString>(1) {
            let template = template.value(&mut cx);

            info!("sampler_new_sample_from_template: template={}", template.as_str());
            
            if let Ok(data) = cx.argument::<JsArray>(2) {
                let mut sysex_payload: Vec<u8> = vec![];
    
                if let Ok(result) = data.to_vec(&mut cx) {
                    for (index, element) in result.iter().enumerate() {
                        if let Ok(value) = (*element).downcast::<JsNumber, CallContext<JsObject>>(&mut cx) {
                            sysex_payload.push(value.value(&mut cx) as u8);
                            info!("sampler_new_sample_from_template: sysex_payload index={}, value={}", index, value.value(&mut cx) as u8);
                        }
                        else {
                            info!("sampler_new_sample_from_template: failed to add value at sysex_payload index={}", index);
                        }
                    }
                }
    
                info!("sampler_new_sample_from_template: sysex_payload length={}", sysex_payload.len());
                
                if sysex_payload.len() == 192 {
                    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::NewSampleFromTemplate(sample_number, template, sysex_payload)));
                    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                        if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                            if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                                return Ok(cx.boolean(success))
                            }
                        }
                    }
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_new_keygroup(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_new_keygroup...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u16;
        if let Ok(keygroup_number) = cx.argument::<JsNumber>(1) {
            let keygroup_number = keygroup_number.value(&mut cx) as u8;

            if let Ok(data) = cx.argument::<JsArray>(2) {
                let mut sysex_payload: Vec<u8> = vec![];
    
                if let Ok(result) = data.to_vec(&mut cx) {
                    for (index, element) in result.iter().enumerate() {
                        if let Ok(value) = (*element).downcast::<JsNumber, CallContext<JsObject>>(&mut cx) {
                            sysex_payload.push(value.value(&mut cx) as u8);
                            info!("sampler_new_keygroup: sysex_payload index={}, value={}", index, value.value(&mut cx) as u8);
                        }
                        else {
                            info!("sampler_new_keygroup: failed to add value at sysex_payload index={}", index);
                        }
                    }
                }
    
                info!("sampler_new_keygroup: sysex_payload length={}", sysex_payload.len());
                
                if sysex_payload.len() == 192 {
                    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::NewKeygroup(program_number, keygroup_number, sysex_payload)));
                    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                        if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                            if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                                return Ok(cx.boolean(success))
                            }
                        }
                    }
                }
            }
    
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_new_sample(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_new_sample...");
    if let Ok(sample_number) = cx.argument::<JsNumber>(0) {
        let sample_number = sample_number.value(&mut cx) as u16;
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::NewSample(sample_number)));
        
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                    return Ok(cx.boolean(success))
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_request_program_header(mut cx: FunctionContext) -> JsResult<JsArray> {
    info!("Entered sampler_request_program_header...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u16;
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestProgramHeader(program_number)));

        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::SamplerEvent(sampler_event) = msg {
                if let OutgoingSamplerEvent::ProgramHeader(data) = sampler_event {
                    let message = cx.empty_array();

                    for (index, value) in data.iter().enumerate() {
                        let value = cx.number(*value);
                        if let Err(error) = message.set(&mut cx, index as u32, value) {
                            error!("sampler_request_program_header - setting JS Array element: {}", error);
                            return Ok(cx.empty_array())
                        }
                    }

                    return Ok(message)
                }
            }
        }
    }

    info!("Problem getting program header.");
    return Ok(cx.empty_array())
}

fn sampler_change_program_header(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_change_program_header...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u8;

        if let Ok(program_header_offset) = cx.argument::<JsNumber>(1) {
            let program_header_offset = program_header_offset.value(&mut cx) as u8;

            if let Ok(program_header_data) = cx.argument::<JsArray>(2) {
                let mut changed_program_header_data = vec![];

                if let Ok(program_header_data) = program_header_data.to_vec(&mut cx) {
                    for value in program_header_data.iter() {
                        if let Ok(data) = value.downcast::<JsNumber, FunctionContext>(&mut cx) {
                            changed_program_header_data.push(data.value(&mut cx) as u8);
                        }
                    }
                }

                let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::ChangeProgramHeader(program_number, program_header_offset, changed_program_header_data)));

                if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                    if let OutgoingEvent::SamplerEvent(sampler_event) = msg {
                        if let OutgoingSamplerEvent::S1000CommandReply(success) = sampler_event {
                            info!("sampler_change_program_header: S1000CommandReply={}", success);
                            return Ok(cx.boolean(success))
                        }
                    }
                }
                else {
                    info!("sampler_change_program_header: receive timeout.");
                }
            }
        }
    }

    info!("sampler_change_program_header: failure.");
                    
    return Ok(cx.boolean(false))
}

fn sampler_request_keygroup_header(mut cx: FunctionContext) -> JsResult<JsArray> {
    info!("Entered sampler_request_keygroup_header...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u16;
        info!("Found a keygroup program number: {}", program_number);

        if let Ok(keygroup_number) = cx.argument::<JsNumber>(1) {
            let keygroup_number = keygroup_number.value(&mut cx) as u8;
            let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestKeygroupHeader(program_number, keygroup_number)));

            info!("Found a keygroup number: {}", keygroup_number);

            if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                    if let OutgoingSamplerEvent::KeygroupHeader(data) = sample_event {
                        let message = cx.empty_array();

                        for (index, value) in data.iter().enumerate() {
                            let value = cx.number(*value);
                            if let Err(error) = message.set(&mut cx, index as u32, value) {
                                error!("sampler_request_keygroup_header - setting JS Array element: {}", error);
                                return Ok(cx.empty_array())
                            }
                        }
    
                        return Ok(message)
                    }
                }
            }
        }
    }

    info!("Problem getting keygroup header.");
    return Ok(cx.empty_array())
}

fn sampler_change_keygroup_header(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_change_keygroup_header...");
    if let Ok(program_number) = cx.argument::<JsNumber>(0) {
        let program_number = program_number.value(&mut cx) as u8;
        info!("Found a keygroup program number: {}", program_number);

        if let Ok(keygroup_number) = cx.argument::<JsNumber>(1) {
            let keygroup_number = keygroup_number.value(&mut cx) as u8;

            info!("Found a keygroup number: {}", keygroup_number);

            if let Ok(keygroup_header_offset) = cx.argument::<JsNumber>(2) {
                let keygroup_header_offset = keygroup_header_offset.value(&mut cx) as u8;

                if let Ok(keygroup_header_data) = cx.argument::<JsArray>(3) {
                    let mut changed_keygroup_header_data = vec![];

                    if let Ok(keygroup_header_data) = keygroup_header_data.to_vec(&mut cx) {
                        for value in keygroup_header_data.iter() {
                            if let Ok(data) = value.downcast::<JsNumber, FunctionContext>(&mut cx) {
                                changed_keygroup_header_data.push(data.value(&mut cx) as u8);
                                info!("keygroup header change byte from javascript array: {}", data.value(&mut cx))
                            }
                            else {
                                info!("Unable to get keygroup header change byte from javascript array.")
                            }
                        }
                    }

                    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(
                        IncomingSamplerEvent::ChangeKeyGroupHeader(program_number, keygroup_number, keygroup_header_offset, changed_keygroup_header_data)));
                    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                        if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                            if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                                return Ok(cx.boolean(success))
                            }
                        }
                    }
                }
            }
        }
    }

    info!("sampler_change_keygroup_header: failure.");
                    
    return Ok(cx.boolean(false))
}
    
fn sampler_request_sample_header(mut cx: FunctionContext) -> JsResult<JsArray> {
    info!("Entered sampler_request_sample_header...");
    if let Ok(sample_number) = cx.argument::<JsNumber>(0) {
        let sample_number = sample_number.value(&mut cx) as u16;
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestSampleHeader(sample_number)));
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                if let OutgoingSamplerEvent::SampleHeader(data) = sample_event {
                    let message = cx.empty_array();

                    for (index, value) in data.iter().enumerate() {
                        let value = cx.number(*value);
                        if let Err(error) = message.set(&mut cx, index as u32, value) {
                            error!("sampler_request_sample_header - setting JS Array element: {}", error);
                            return Ok(cx.empty_array())
                        }
                    }

                    return Ok(message)
                }
            }
        }
    }

    info!("Problem getting sample header.");
    return Ok(cx.empty_array())
}

fn sampler_change_sample_header(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_change_sample_header...");
    if let Ok(sample_number) = cx.argument::<JsNumber>(0) {
        let sample_number = sample_number.value(&mut cx) as u8;

        if let Ok(sample_header_offset) = cx.argument::<JsNumber>(1) {
            let sample_header_offset = sample_header_offset.value(&mut cx) as u8;

            if let Ok(sample_header_data) = cx.argument::<JsArray>(2) {
                let mut changed_sample_header_data = vec![];

                if let Ok(sample_header_data) = sample_header_data.to_vec(&mut cx) {
                    for value in sample_header_data.iter() {
                        if let Ok(data) = value.downcast::<JsNumber, FunctionContext>(&mut cx) {
                            changed_sample_header_data.push(data.value(&mut cx) as u8);
                        }
                    }
                }

                let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(
                    IncomingSamplerEvent::ChangeSampleHeader(sample_number, sample_header_offset, changed_sample_header_data)));
                if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                    if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                        if let OutgoingSamplerEvent::S1000CommandReply(success) = sample_event {
                            return Ok(cx.boolean(success))
                    }
                    }
                }
            }
        }
    }
                    
    return Ok(cx.boolean(false))
}

fn sampler_request_volume_list_entry(mut cx: FunctionContext) -> JsResult<JsObject> {
    info!("Entered sampler_request_volume_list_entry...");
    if let Ok(entry_number) = cx.argument::<JsNumber>(0) {
        let entry_number = entry_number.value(&mut cx) as u16;
        let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestVolumeList(entry_number)));
        if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
            if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                if let OutgoingSamplerEvent::VolumeList(name, error) = sample_event {
                    let message = cx.empty_object();
                    let js_name = cx.string(name);
                    let entry_number = cx.number(entry_number);

                    let _ = message.set(&mut cx, "entry_number", entry_number);
                    let _ = message.set(&mut cx, "entry_name", js_name);
                    
                    if let Some(error) = error {
                        let js_error = cx.string(error);
                        let _ = message.set(&mut cx, "error", js_error);
                    }

                    return Ok(message)
            }
            }
        }
    }

    let message = cx.empty_object();
    let entry_number = cx.number(-1);
    let name = cx.string("");
    let error = cx.string("Could not get the entry_number.");

    let _ = message.set(&mut cx, "entry_number", entry_number);
    let _ = message.set(&mut cx, "entry_name", name);
    let _ = message.set(&mut cx, "error", error);
                    
    return Ok(message)
}

fn sampler_hard_disk_directory_entry(mut cx: FunctionContext) -> JsResult<JsObject> {
    info!("Entered sampler_hard_disk_directory_entry...");
    if let Ok(entry_number) = cx.argument::<JsNumber>(0) {
        let entry_number = entry_number.value(&mut cx) as u16;
        if let Ok(selector) = cx.argument::<JsNumber>(1) {
            let selector = selector.value(&mut cx) as u8;
            let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestHardDiskDirEntry(entry_number, selector)));
            if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                    if let OutgoingSamplerEvent::HardDiskDirEntry(name, error) = sample_event {
                        let message = cx.empty_object();
                        let js_name = cx.string(name);
                        let entry_number = cx.number(entry_number);
                        let selector = cx.number(selector);

                        let _ = message.set(&mut cx, "entry_number", entry_number);
                        let _ = message.set(&mut cx, "selector", selector);
                        let _ = message.set(&mut cx, "entry_name", js_name);
                        
                        if let Some(error) = error {
                            let js_error = cx.string(error);
                            let _ = message.set(&mut cx, "error", js_error);
                        }

                        return Ok(message)
                    }
                }
            }
        }
    }

    let message = cx.empty_object();
    let entry_number = cx.number(-1);
    let selector = cx.number(-1);
    let name = cx.string("");
    let error = cx.string("Could not get the entry_number and or the selector.");

    let _ = message.set(&mut cx, "entry_number", entry_number);
    let _ = message.set(&mut cx, "selector", selector);
    let _ = message.set(&mut cx, "entry_name", name);
    let _ = message.set(&mut cx, "error", error);
Ok(message)
}

fn sampler_request_resident_program_names(mut cx: FunctionContext) -> JsResult<JsArray> {
    info!("Entered sampler_request_resident_program_names...");
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestResidentProgramNames));
    let resident_program_names = cx.empty_array();

    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::SamplerEvent(sampler_event) = msg {
            if let OutgoingSamplerEvent::ResidentProgramNames(program_names, error) = sampler_event {
                if error == None {
                    for (index, name) in program_names.iter().enumerate() {
                        let js_name = cx.string(name);
                        let _ = resident_program_names.set(&mut cx, index as u32, js_name);
                    }
                }
            }
        }
    }

    Ok(resident_program_names)
}

fn sampler_request_resident_sample_names(mut cx: FunctionContext) -> JsResult<JsArray> {
    info!("Entered sampler_request_resident_sample_names...");
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestResidentSampleNames));
    let resident_sample_names = cx.empty_array();

    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::SamplerEvent(sampler_event) = msg {
            if let OutgoingSamplerEvent::ResidentSampleNames(sample_names, error) = sampler_event {
                if error == None {
                    for (index, name) in sample_names.iter().enumerate() {
                        let js_name = cx.string(name);
                        let _ = resident_sample_names.set(&mut cx, index as u32, js_name);
                    }
                }
            }
        }
    }

    Ok(resident_sample_names)
}

fn sampler_status_report(mut cx: FunctionContext) -> JsResult<JsObject> {
    info!("Entered sampler_status_report...");
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::StatusReport));
    let sampler_status_report = cx.empty_object();

    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::SamplerEvent(sampler_event) = msg {
            if let OutgoingSamplerEvent::StatusReport(status_data, error) = sampler_event {
                if error == None {
                    let keys = status_data.keys().sorted();
                    for name in keys.into_iter() {
                        if let Some(value) = status_data.get(name) {
                            let js_name = cx.string(name.replace("_", " "));
                            let js_value = cx.number(*value);
                            let _ = sampler_status_report.set(&mut cx, js_name, js_value);
                        }
                    }
                }
            }
        }
    }

    Ok(sampler_status_report)
}

fn sampler_s1000_miscellaneous_data(mut cx: FunctionContext) -> JsResult<JsObject> {
    info!("Entered sampler_s1000_miscellaneous_data...");
    let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestS1000MiscellaneousData));
    let sampler_status_report = cx.empty_object();
    if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
        if let OutgoingEvent::SamplerEvent(sample_event) = msg {
            if let OutgoingSamplerEvent::S1000MiscellaneousData(misc_data, error) = sample_event {
                if error == None {
                    for (name, value) in misc_data.iter() {
                        let js_name = cx.string(name.clone());
                        let js_value = cx.number(*value);
                        let _ = sampler_status_report.set(&mut cx, js_name, js_value);
                    }
                }
            }
        }
    }

    Ok(sampler_status_report)
}

fn sampler_request_miscellaneous_bytes(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    info!("Entered sampler_request_miscellaneous_bytes...");
    if let Ok(data_index) = cx.argument::<JsNumber>(0) {
        let data_index = data_index.value(&mut cx) as u16;
        if let Ok(data_ban_knumber) = cx.argument::<JsNumber>(1) {
            let data_ban_knumber = data_ban_knumber.value(&mut cx) as u8;
            let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestMiscellaneousBytes(data_index, data_ban_knumber)));
            if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(RECEIVE_TIMEOUT.clone()) {
                if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                    if let OutgoingSamplerEvent::MiscellaneousBytes = sample_event {
                        return Ok(cx.boolean(true))
                    }
                }
            }
        }
    }

    Ok(cx.boolean(false))
}


fn sampler_request_sample_data(mut cx: FunctionContext) -> JsResult<JsArray> {
    info!("Entered sampler_request_sample_data...");
    let sample_data = cx.empty_array();
    
    if let Ok(sample_number) = cx.argument::<JsNumber>(0) {
        let sample_number = sample_number.value(&mut cx) as u16;
        
        if let Ok(number_of_samples) = cx.argument::<JsNumber>(1) {
            let number_of_samples = number_of_samples.value(&mut cx);

            info!("sampler_request_sample_data: number of samples={}", number_of_samples);
            
            let _ = INCOMING_COMM_CHANNELS.tx.send(IncomingEvent::SamplerEvent(IncomingSamplerEvent::RequestSampleData(sample_number, number_of_samples as u32)));
            if let Ok(msg) = OUT_GOING_COMM_CHANNELS.rx.recv_timeout(Duration::from_secs(100)) {
                if let OutgoingEvent::SamplerEvent(sample_event) = msg {
                    if let OutgoingSamplerEvent::SampleData(samples) = sample_event {
                        for (index, sample) in samples.iter().enumerate() {
                            let key = cx.number(index as f64);
                            let value = cx.number(*sample as f64);
                            let _ = sample_data.set(&mut cx, key, value);
                        }
                        return Ok(sample_data)
                    }
                }
            }
        }
    }
                    
    return Ok(sample_data)
}

fn convert_sampler_sysex_name_to_name(sampler_sysex_name: &Vec<u8>) -> String {
    let mut name = String::from("");
    
    for (index, letter) in sampler_sysex_name.iter().enumerate() {
        if index < 12 && (*letter as usize) < SAMPLER_CHAR_MAP.len() {
            name.push(SAMPLER_CHAR_MAP[*letter as usize]);
        }
    }

    name
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("list_midi_input_ports", list_midi_input_ports)?;
    cx.export_function("list_midi_output_ports", list_midi_output_ports)?;
    cx.export_function("list_midi_connections", list_midi_connections)?;
    cx.export_function("connect_to_input_port", connect_to_input_port)?;
    cx.export_function("connect_to_output_port", connect_to_output_port)?;
    cx.export_function("sampler_request_volume_list_entry", sampler_request_volume_list_entry)?;
    cx.export_function("sampler_hard_disk_directory_entry", sampler_hard_disk_directory_entry)?;
    cx.export_function("sampler_request_resident_program_names", sampler_request_resident_program_names)?;
    cx.export_function("sampler_request_resident_sample_names", sampler_request_resident_sample_names)?;
    cx.export_function("sampler_status_report", sampler_status_report)?;
    cx.export_function("sampler_request_program_header", sampler_request_program_header)?;
    cx.export_function("sampler_request_keygroup_header", sampler_request_keygroup_header)?;
    cx.export_function("sampler_request_sample_header", sampler_request_sample_header)?;
    cx.export_function("sampler_request_sample_data", sampler_request_sample_data)?;
    cx.export_function("sampler_delete_program", sampler_delete_program)?;
    cx.export_function("sampler_delete_keygroup", sampler_delete_keygroup)?;
    cx.export_function("sampler_delete_sample", sampler_delete_sample)?;
    cx.export_function("sampler_new_program", sampler_new_program)?;
    cx.export_function("sampler_new_keygroup", sampler_new_keygroup)?;
    cx.export_function("sampler_new_sample_from_template", sampler_new_sample_from_template)?;
    cx.export_function("sampler_new_sample", sampler_new_sample)?;
    cx.export_function("sampler_s1000_miscellaneous_data", sampler_s1000_miscellaneous_data)?;
    cx.export_function("sampler_request_miscellaneous_bytes", sampler_request_miscellaneous_bytes)?;
    cx.export_function("sampler_change_program_header", sampler_change_program_header)?;
    cx.export_function("sampler_change_keygroup_header", sampler_change_keygroup_header)?;
    cx.export_function("sampler_change_sample_header", sampler_change_sample_header)?;
    
    // setup logging
    let logger_init_result = Logger::try_with_str("debug");
    let _logger = if let Ok(logger) = logger_init_result {
        let logger = logger
            .start();
        Some(logger)
    }
    else {
        None
    };

    kick_off_midir();

    Ok(())
}

fn kick_off_midir() {
    let in_comm_channels = INCOMING_COMM_CHANNELS.clone();
    let out_comm_channels = OUT_GOING_COMM_CHANNELS.clone();
    
    std::thread::spawn(move || {
        let mut keep_alive = true;
        let mut input_connection: Option<MidiInputConnection<()>> = None;
        let mut output_connection: Option<MidiOutputConnection> = None;
        let mut input_port: Option<MidiInputPort> = None;
        let mut output_port: Option<MidiOutputPort> = None;
        let mut client_request_received = Arc::new(Mutex::new(false));
        let mut sample_dump_packets_to_send = Arc::new(Mutex::new(VecDeque::<Vec<u8>>::new()));
        let mut expected_sample_dump_packets = Arc::new(Mutex::new(0));

        let mut midi_in = MidiInput::new("sampler sysex editor input").unwrap();
        let mut midi_out = MidiOutput::new("sampler sysex editor output").unwrap();

        let mut sysex_to_sampler_queue: Arc<Mutex<VecDeque<Vec<u8>>>> = Arc::new(Mutex::new(VecDeque::new()));
        let mut string_buf = "".to_string();

        while keep_alive {
            if let Ok(mut client_request_received) = client_request_received.lock() {
                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                    if !*client_request_received && sysex_to_sampler_queue.len() > 0 {
                        *client_request_received = true;
                        if let Some(message) = sysex_to_sampler_queue.pop_front() {
                            if let Some(connection) = output_connection.as_mut() {
                                string_buf.push_str(format!("Sending to sampler: ").as_str());
                                for value in message.iter() {
                                    string_buf.push_str(format!("{}, ", value).as_str());
                                }
                                info!("{}", string_buf.as_str());
                                string_buf.clear();
                                let _ = connection.send(&message);
                            }
                        }
                    }
                }
            }

            if let Ok(received) = in_comm_channels.rx.try_recv() {
                match received {
                    IncomingEvent::GetInputPorts => {
                        let mut devices_details = HashMap::new();

                        for (index, in_port) in midi_in.ports().iter().enumerate() {
                            if let Ok(port_name) = midi_in.port_name(in_port) {
                                devices_details.insert(index as i32, port_name);
                            }
                        }

                        let _ = out_comm_channels.tx.send(OutgoingEvent::InputPorts(devices_details));
                    },
                    IncomingEvent::GetOutputPorts => {
                        let mut devices_details = HashMap::new();

                        for (index, output_port) in midi_in.ports().iter().enumerate() {
                            if let Ok(port_name) = midi_in.port_name(output_port) {
                                devices_details.insert(index as i32, port_name);
                            }
                        }

                        let _ = out_comm_channels.tx.send(OutgoingEvent::OutputPorts(devices_details));
                    },
                    IncomingEvent::ConnectToOutputPort(id) => {
                        let mut connected = false;
                        let mut in_ports = midi_in.ports();

                        if let Some(in_port) = in_ports.get(id as usize) {
                            let out_comm_channels_tx = out_comm_channels.tx.clone();
                            let client_request_received = client_request_received.clone();
                            let expected_sample_dump_packets = expected_sample_dump_packets.clone();
                            let sample_dump_packet_ack_handler = 
                                            SampleSysexSampleDumpAckMessageHandler::new(sample_dump_packets_to_send.clone(), sysex_to_sampler_queue.clone());
                            let mut sample_sysex_message_processor = SampleSysexMessageProcessor::new();

                            if let Ok(connection_in) = MidiInput::new("sampler sysex editor input").unwrap().connect(
                                in_port, 
                                "", 
                                move |_, message, _| {
                                    info!("Output connection to sampler callback: Entered...");
                                    let mut string_buf = "".to_string();

                                    for value in message.iter() {
                                        string_buf.push_str(format!("{}, ", value).as_str());
                                    }

                                    if let Ok(mut client_request_received) = client_request_received.lock() {
                                        if let Ok(expected_sample_dump_packets) = expected_sample_dump_packets.lock() {
                                            sample_sysex_message_processor.sample_dump_packet_message_handler_mut().set_expected_sample_dump_data_packet_count(*expected_sample_dump_packets);
                                        }
                                        if *client_request_received {
                                            info!("Output connection to sampler callback: Processing client requested sampler sysex message...");
                                            info!("Output connection to sampler callback: Received from sampler: {}", string_buf.as_str());
                                            let message_vec = message.to_vec();
                                            if !sample_sysex_message_processor.handle_message(&message_vec, &out_comm_channels_tx) {
                                                info!("Output connection to sampler callback: Could not find a message handler.");
                                                if sample_dump_packet_ack_handler.can_handle(&message_vec) {
                                                    sample_dump_packet_ack_handler.handle(&message_vec, &out_comm_channels_tx);
                                                }
                                            }
                                            string_buf.clear();
                                            *client_request_received = false;
                                        }
                                        else if !*client_request_received {
                                            info!("Output connection to sampler callback: Processing sampler sysex message...");
                                            info!("Output connection to sampler callback: Received from sampler: {}", string_buf.as_str());

                                            let message_vec = message.to_vec();
                                            if sample_dump_packet_ack_handler.can_handle(&message_vec) {
                                                sample_dump_packet_ack_handler.handle(&message_vec, &out_comm_channels_tx);
                                            }
                                            else if sample_sysex_message_processor.sample_dump_packet_message_handler().can_handle(&message_vec) {
                                                sample_sysex_message_processor.sample_dump_packet_message_handler_mut().handle_mut(&message_vec, &out_comm_channels_tx);
                                            }

                                            string_buf.clear();
                                        }
                                    }
                                    info!("Output connection to sampler callback: Exited.");
                                },
                                ()
                            ) {
                                input_connection = Some(connection_in);
                                input_port = Some(in_port.clone());
                                connected = true;
                            }
                        }

                        let _ = out_comm_channels.tx.send(OutgoingEvent::ConnectToOutputPortResult(connected));
                    },
                    IncomingEvent::ConnectToInputPort(id) => {
                        let mut connected = false;
                        let mut midi_out = MidiOutput::new("sampler sysex editor output").unwrap();
                        let mut out_ports = midi_out.ports();

                        if let Some(out_port) = out_ports.get(id as usize) {
                            if let Ok(connection_out) = midi_out.connect(
                                out_port, 
                                "",
                            ) {
                                output_connection = Some(connection_out);
                                output_port = Some(out_port.clone());
                                connected = true;
                            }
                        }

                        let _ = out_comm_channels.tx.send(OutgoingEvent::ConnectToInputPortResult(connected));
                    },
                    IncomingEvent::Close => keep_alive = false,
                    IncomingEvent::GetConnections => {
                        let mut connections = vec![];

                        if let Some(output_port) = output_port.as_ref() {
                            for (index, port) in midi_out.ports().iter().enumerate() {
                                if midi_out.port_name(output_port) == midi_out.port_name(port) {
                                    connections.push((index as i32, midi_out.port_name(output_port).unwrap(), false));
                                    break;
                                }
                            }
                        }
                        if let Some(input_port) = input_port.as_ref() {
                            for (index, port) in midi_in.ports().iter().enumerate() {
                                if midi_in.port_name(input_port) == midi_in.port_name(port) {
                                    connections.push((index as i32, midi_in.port_name(input_port).unwrap(), true));
                                    break;
                                }
                            }
                        }

                        let _ = out_comm_channels.tx.send(OutgoingEvent::Connections(connections));
                    }
                    IncomingEvent::SamplerEvent(sampler_event) => {
                        info!("Client request for sampler received.");

                        match sampler_event {
                            IncomingSamplerEvent::NewProgram(program_number, payload) => {
                                info!("Received new program from client.");

                                info!("Sending new program to sampler.");
                                let mut message = vec![];
                                let program_number_lsb = (program_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::PDATA as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);

                                // handle the payload
                                for element in payload.iter() {
                                    message.push(element & 15);
                                    message.push(element >> 4);
                                }

                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::NewSampleFromTemplate(sample_number, template, payload) => {
                                info!("Received new sample from template from client.");

                                info!("NewSampleFromTemplate: Sending new sample from template to sampler.");
                                let mut message = vec![];
                                let sample_number_lsb = (sample_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_number_msb = (sample_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("NewSampleFromTemplate: Sample number lsb={}, msb={}", sample_number_lsb, sample_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::SDATA as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(sample_number_lsb);
                                message.push(sample_number_msb);

                                // handle the payload
                                for element in payload.iter() {
                                    message.push(element & 15);
                                    message.push(element >> 4);
                                }

                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    if let Ok(mut sample_dump_packets_to_send) = sample_dump_packets_to_send.lock() {
                                        sysex_to_sampler_queue.push_back(message);

                                        let frequency   = 440.0;
                                        let mut oscillator = Oscillator::new(frequency, template);
                                        let number_of_samples = (44100.0 / 440.0) as i32;
                                        let mut samples = vec![];
    
                                        // data
                                        for _ in 0..number_of_samples {
                                            let sample = oscillator.next_sample();
                                            samples.push((sample & 63) as u8);
                                            samples.push(((sample >> 6) & 63) as u8);
                                            samples.push(((sample >> 12) & 63) as u8);
                                        }
                                        
                                        let full_packets = samples.len() / 120;
                                        let partial_packet = samples.len() % 120;
                                        let number_of_packets: usize = if partial_packet > 0 {
                                            full_packets + 1
                                        }
                                        else {
                                            full_packets
                                        };
                                        for packet_number in 0..number_of_packets {
    
                                            let mut midi_sample_dump_data_packet = vec![];
                                            let mut checksum = 0;
                                            let mut converted_samples_used = 0;
    
                                            midi_sample_dump_data_packet.push(START_OF_SYSTEM_EXCLUSIVE);
                                            midi_sample_dump_data_packet.push(SYSEX_NON_REAL_TIME_CATEGORY);
                                            checksum ^= SYSEX_NON_REAL_TIME_CATEGORY;
                                            midi_sample_dump_data_packet.push(0x00);
                                            checksum ^= 0x00;
                                            midi_sample_dump_data_packet.push(SAMPLE_DUMP_STANDARD_DATA_PACKET);
                                            checksum ^= SAMPLE_DUMP_STANDARD_DATA_PACKET;
                                            midi_sample_dump_data_packet.push(packet_number as u8);
                                            checksum ^= packet_number as u8;
    
                                            // loop until 120 samples or end
                                            while converted_samples_used < 120 && samples.len() > 0 {
                                                let sample = samples.remove(0);
                                                checksum ^= sample;
                                                midi_sample_dump_data_packet.push(sample);
                                                converted_samples_used += 1;
                                            }
    
                                            // if less than 120 in real data pad up to 120 with 0s
                                            while converted_samples_used < 120 {
                                                checksum ^= 0;
                                                midi_sample_dump_data_packet.push(0);
                                                converted_samples_used += 1;
                                            }
    
                                            // finish the checksum
                                            checksum &= 0x7F;
                                            midi_sample_dump_data_packet.push(checksum);
    
                                            midi_sample_dump_data_packet.push(EOX);
    
                                            info!("NewSampleFromTemplate: Midi sample dump: ");
                                            let mut sample_dump_packet_display = "NewSampleFromTemplate: Midi sample dump: ".to_string();
                                            for value in midi_sample_dump_data_packet.iter() {
                                                sample_dump_packet_display.push_str(format!("{}, ", value).as_str());
                                            }
                                            info!("{}", sample_dump_packet_display);

                                            info!("NewSampleFromTemplate: Adding sample dump packet #{} to sample_dump_packets_to_send.", packet_number);
                                            sample_dump_packets_to_send.push_back(midi_sample_dump_data_packet);
                                        }
                                    }
                                }
                            }
                            IncomingSamplerEvent::NewKeygroup(program_number, keygroup_number, payload) => {
                                info!("Received new key group from client.");
                                info!("Sending new key group to sampler.");
                                let mut message = vec![];
                                let program_number_lsb = (program_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::KDATA as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(keygroup_number);

                                // handle the payload
                                for element in payload.iter() {
                                    message.push(element & 15);
                                    message.push(element >> 4);
                                }

                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::NewSample(sample_number) => {
                                info!("Received new sample from client.");
                                info!("Sending new sample to sampler.");
                                let mut message = vec![];
                                let sample_number_lsb = (sample_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_number_msb = (sample_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Sample number lsb={}, msb={}", sample_number_lsb, sample_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::SDATA as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(sample_number_lsb);
                                message.push(sample_number_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::DeleteProgram(program_number) => {
                                info!("Received delete program from client.");
                                info!("Sending delete program to sampler.");
                                let mut message = vec![];
                                let program_number_lsb = (program_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::DELP as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::DeleteKeygroup(program_number, keygroup_number) => {
                                info!("Received delete key group from client.");
                                info!("Sending delete key group to sampler.");
                                let mut message = vec![];
                                let program_number_lsb = (program_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::DELK as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(keygroup_number);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::DeleteSample(sample_number) => {
                                info!("Received delete sample from client.");
                                info!("Sending delete sample to sampler.");
                                let mut message = vec![];
                                let sample_number_lsb = (sample_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_number_msb = (sample_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Sample number lsb={}, msb={}", sample_number_lsb, sample_number_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::DELS as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(sample_number_lsb);
                                message.push(sample_number_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestProgramHeader(program_number) => {
                                info!("Received request program header from client.");
                                info!("Sending request program header to sampler.");
                                let mut message = vec![];
                                let program_number_lsb = (program_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (AKAI_HEADER_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (AKAI_HEADER_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestProgramHeader as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::ChangeProgramHeader(program_number, program_header_offset, data) => {
                                info!("Received change program header from client.");
                                info!("Sending change program header to sampler.");
                                let mut message: Vec<u8> = vec![];
                                let program_number_lsb = (program_number as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let program_header_offset_lsb = (program_header_offset as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_header_offset_msb = (program_header_offset as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (data.len() as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (data.len() as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);
                                info!("Program header off set lsb={}, msb={}", program_header_offset_lsb, program_header_offset_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::ResponseProgramHeader as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(0x00);

                                // program header offset
                                message.push(program_header_offset_lsb);
                                message.push(program_header_offset_msb);

                                // number of bytes of program header data being sent
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);

                                // nibbled program header data being sent
                                for value in data.iter() {
                                    message.push(value & 15); // lsb first
                                    message.push(value >> 4); // msb last
                                }

                                message.push(EOX);

                                print!("Sending to sampler - program header change: ");
                                for value in message.iter() {
                                    print!("{:X}, ", value);
                                }
                                println!();

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::ChangeKeyGroupHeader(program_number, keygroup_number, keygroup_header_offset, data) => {
                                info!("Received change key group header from client.");
                                info!("Sending change key group header to sampler.");
                                let mut message: Vec<u8> = vec![];
                                let program_number_lsb = (program_number as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let keygroup_header_offset_lsb = (keygroup_header_offset as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let keygroup_header_offset_msb = (keygroup_header_offset as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (data.len() as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (data.len() as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);
                                info!("Key group header off set lsb={}, msb={}", keygroup_header_offset_lsb, keygroup_header_offset_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::ResponseKeygroupHeader as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(keygroup_number);

                                // header offset
                                message.push(keygroup_header_offset_lsb);
                                message.push(keygroup_header_offset_msb);

                                // number of bytes of header data being sent
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);

                                // nibbled header data being sent
                                for value in data.iter() {
                                    message.push(value & 15); // lsb first
                                    message.push(value >> 4); // msb last
                                }

                                message.push(EOX);

                                print!("Sending to sampler - keygroup header change: ");
                                for value in message.iter() {
                                    print!("{:X}, ", value);
                                }
                                println!();

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::ChangeSampleHeader(sample_number, sample_header_offset, data) => {
                                info!("Received change sample header from client.");
                                info!("Sending change sample header to sampler.");
                                let mut message: Vec<u8> = vec![];
                                let sample_number_lsb = (sample_number as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_number_msb = (sample_number as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let sample_header_offset_lsb = (sample_header_offset as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_header_offset_msb = (sample_header_offset as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (data.len() as u16 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (data.len() as u16 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Sample number lsb={}, msb={}", sample_number_lsb, sample_number_msb);
                                info!("Sample header off set lsb={}, msb={}", sample_header_offset_lsb, sample_header_offset_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::ResponseSampleHeader as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(sample_number_lsb);
                                message.push(sample_number_msb);
                                message.push(0x00);

                                // program header offset
                                message.push(sample_header_offset_lsb);
                                message.push(sample_header_offset_msb);

                                // number of bytes of program header data being sent
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);

                                // nibbled program header data being sent
                                for value in data.iter() {
                                    message.push(value & 15); // lsb first
                                    message.push(value >> 4); // msb last
                                }

                                message.push(EOX);

                                print!("Sending to sampler - sample header change: ");
                                for value in message.iter() {
                                    print!("{:X}, ", value);
                                }
                                println!();

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestKeygroupHeader(program_number, keygroup_number) => {
                                info!("Received request key group header from client.");
                                info!("Sending request key group header to sampler.");
                                let mut message = vec![];
                                let program_number_lsb = (program_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let program_number_msb = (program_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (AKAI_HEADER_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (AKAI_HEADER_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Program number lsb={}, msb={}", program_number_lsb, program_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestKeygroupHeader as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(program_number_lsb);
                                message.push(program_number_msb);
                                message.push(keygroup_number);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestSampleHeader(sample_number) => {
                                info!("Received request sample header from client.");
                                info!("Sending request sample header to sampler.");
                                let mut message = vec![];
                                let sample_number_lsb = (sample_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_number_msb = (sample_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (AKAI_HEADER_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (AKAI_HEADER_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Sample number lsb={}, msb={}", sample_number_lsb, sample_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestSampleHeader as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(sample_number_lsb);
                                message.push(sample_number_msb);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestSampleData(sample_number, number_of_samples) => {
                                info!("Received request sample header from client.");
                                info!("Sending request sample header to sampler.");
                                let mut message = vec![];
                                let sample_number_lsb = (sample_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let sample_number_msb = (sample_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_samples_lsb = (number_of_samples & U32_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_samples_byte2 = ((number_of_samples >> U32_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) & U32_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_samples_byte3 = ((number_of_samples >> (U32_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT * 2)) & U32_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_samples_msb = ((number_of_samples >> (U32_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT * 3)) & U32_LSB_TO_AKAI_U8_MASK) as u8;

                                info!("Sample number lsb={}, msb={}", sample_number_lsb, sample_number_msb);
                                info!("Number of samples lsb={}, byte2={}, byte3={}, msb={}", number_of_samples_lsb, number_of_samples_byte2, number_of_samples_byte3, number_of_samples_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::RSPACK as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(sample_number_lsb);
                                message.push(sample_number_msb);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_samples_lsb);
                                message.push(number_of_samples_byte2);
                                message.push(number_of_samples_byte3);
                                message.push(number_of_samples_msb);
                                message.push(0x01);
                                message.push(0x00);
                                message.push(EOX);

                                if let Ok(mut client_request_received) = client_request_received.lock() {
                                    *client_request_received = false;
                                }

                                if let Ok(mut expected_sample_dump_packets) = expected_sample_dump_packets.lock() {
                                    let sample_dump_data_count = number_of_samples * 3;
                                    let remainder = sample_dump_data_count % 120; 
                                    let number_of_packets = if remainder > 0 {
                                        sample_dump_data_count / 120 + 1
                                    }
                                    else {
                                        sample_dump_data_count / 120
                                    };
                                    *expected_sample_dump_packets = number_of_packets as i32;
                                }

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestFXReverb(effect_number, selector) => {
                                info!("Received request FX/Reverb from client.");
                                info!("Sending request FX/Reverb to sampler.");
                                let mut message = vec![];
                                let effect_number_lsb = (effect_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let effect_number_msb = (effect_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (AKAI_HEADER_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (AKAI_HEADER_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Effect number lsb={}, msb={}", effect_number_lsb, effect_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestFXReverb as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(effect_number_lsb);
                                message.push(effect_number_msb);
                                message.push(selector);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestCueList(event_number, selector) => {
                                info!("Received request cue list from client.");
                                info!("Sending request cue list to sampler.");
                                let mut message = vec![];
                                let event_number_lsb = (event_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let event_number_msb = (event_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (CUE_LIST_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (CUE_LIST_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("cue list lsb={}, msb={}", event_number_lsb, event_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestCueList as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(event_number_lsb);
                                message.push(event_number_msb);
                                message.push(selector);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestTakeList(take_number, selector) => {
                                info!("Received request take list from client.");
                                info!("Sending request take list to sampler.");
                                let mut message = vec![];
                                let take_number_lsb = (take_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let take_number_msb = (take_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (TAKE_LIST_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (TAKE_LIST_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("take list lsb={}, msb={}", take_number_lsb, take_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestTakeList as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(take_number_lsb);
                                message.push(take_number_msb);
                                message.push(selector);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestMiscellaneousBytes(data_index, data_bank_number) => {
                                info!("Received request miscellaneous from client.");
                                info!("Sending request miscellaneous to sampler.");
                                let mut message = vec![];
                                let data_index_lsb = (data_index & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let data_index_msb = (data_index >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (NAME_ENTRY_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (NAME_ENTRY_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Data index lsb={}, msb={}", data_index_lsb, data_index_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestMiscellaneous as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(data_index_lsb);
                                message.push(data_index_msb);
                                message.push(data_bank_number);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestS1000MiscellaneousData => {
                                info!("Received request s1000 miscellaneous data from client.");
                                info!("Sending request s1000 miscellaneous data to sampler.");
                                let mut message = vec![];

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::RMDATA as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestVolumeList(entry_number) => {
                                info!("Received request volume list from client.");
                                info!("Sending request volume list to sampler.");
                                let mut message = vec![];
                                let entry_number_lsb = (entry_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let entry_number_msb = (entry_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (NAME_ENTRY_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (NAME_ENTRY_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Entry number lsb={}, msb={}", entry_number_lsb, entry_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestVolumeListItem as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(entry_number_lsb);
                                message.push(entry_number_msb);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestHardDiskDirEntry(entry_number, selector) => {
                                info!("Received request hard disk directory entry from client.");
                                info!("Sending request hard disk directory entry to sampler.");
                                let mut message = vec![];
                                let entry_number_lsb = (entry_number & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let entry_number_msb = (entry_number >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                // let number_of_bytes_of_data_lsb = (NAME_ENTRY_SIZE_IN_BYTES & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                // let number_of_bytes_of_data_msb = (NAME_ENTRY_SIZE_IN_BYTES >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;
                                let number_of_bytes_of_data_lsb = (48 & U16_LSB_TO_AKAI_U8_MASK) as u8;
                                let number_of_bytes_of_data_msb = (48 >> U16_MSB_TO_AKAI_U8_BIT_RIGHT_SHIFT_AMOUNT) as u8;

                                info!("Entry number lsb={}, msb={}", entry_number_lsb, entry_number_msb);
                                info!("Number of bytes of data lsb={}, msb={}", number_of_bytes_of_data_lsb, number_of_bytes_of_data_msb);

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S3000SysexFunctionCodes::RequestHardDiskDirectoryEntry as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(entry_number_lsb);
                                message.push(entry_number_msb);
                                message.push(selector);
                                message.push(0x00);
                                message.push(0x00);
                                message.push(number_of_bytes_of_data_lsb);
                                message.push(number_of_bytes_of_data_msb);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestResidentProgramNames => {
                                info!("Received request resident program names from client.");
                                info!("Sending request resident program names to sampler.");
                                let mut message = vec![];

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::RPLIST as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::RequestResidentSampleNames => {
                                info!("Received request resident sample names from client.");
                                info!("Sending request resident sample names to sampler.");
                                let mut message = vec![];

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::RSLIST as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            IncomingSamplerEvent::StatusReport => {
                                info!("Received request status report from client.");
                                info!("Sending request status report to sampler.");
                                let mut message = vec![];

                                message.push(START_OF_SYSTEM_EXCLUSIVE);
                                message.push(SAMPLER_MANUFACTURER_CODE);
                                message.push(0x00);
                                message.push(S1000SysexFunctionCodes::RSTAT as u8);
                                message.push(SAMPLER_IDENTITY);
                                message.push(EOX);

                                if let Ok(mut sysex_to_sampler_queue) = sysex_to_sampler_queue.lock() {
                                    sysex_to_sampler_queue.push_back(message);
                                }
                            }
                            
                        }
                    }
                }
            }

            std::thread::sleep(Duration::from_millis(100));
        }
    });
}
