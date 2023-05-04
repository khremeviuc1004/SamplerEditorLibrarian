import { Injectable } from '@nestjs/common'
import { Program as InMemoryProgram } from '@sampler-editor-librarian/dto';
import { KeyGroup as InMemoryKeyGroup } from '@sampler-editor-librarian/dto';
import { Sample as InMemorySample } from '@sampler-editor-librarian/dto';
import { SamplerInMemoryProgramMapper } from '../mappers/sampler-program-mapper'
import { SamplerInMemoryKeyGroupMapper } from '../mappers/sampler-key-group-mapper'
import { SamplerInMemorySampleMapper } from '../mappers/sampler-sample-mapper'
const midilib = require('../../index.node')

@Injectable()
export class MidiService {
    constructor() {}

    getMidiInputPorts(): any {
      return midilib.list_midi_input_ports()
    }
  
    getMidiOutputPorts(): any {
      return midilib.list_midi_output_ports()
    }
  
    getMidiConnections(): any {
      return midilib.list_midi_connections()
    }
  
    connectToInputPort(id: number): boolean {
      return midilib.connect_to_input_port(id)
    }
  
    connectToOutputPort(id: number): boolean {
      return midilib.connect_to_output_port(id)
    }

    samplerRequestVolumeListEntry(entryNumber: number): any {
        return midilib.sampler_request_volume_list_entry(entryNumber)
    }

    samplerRequestProgramHeader(programNumber: number): InMemoryProgram {
        let data: Array<number> = midilib.sampler_request_program_header(programNumber)
        let mapper = new SamplerInMemoryProgramMapper()
        return mapper.mapFromSysexData(data)
    }

    samplerRequestSampleHeader(sample_number: number): InMemorySample {
        let data: Array<number> = midilib.sampler_request_sample_header(sample_number)
        let mapper = new SamplerInMemorySampleMapper()
        return mapper.mapFromSysexData(data)
    }

    samplerRequestKeygroupHeader(programNumber: number, keygroupNumber: number): InMemoryKeyGroup {
        let data: Array<number> = midilib.sampler_request_keygroup_header(programNumber, keygroupNumber)
        let mapper = new SamplerInMemoryKeyGroupMapper()
        return mapper.mapFromSysexData(data)
    }

    samplerDeleteProgram(programNumber: number): boolean {
        return midilib.sampler_delete_program(programNumber)
    }

    samplerNewProgram(programNumber: number): boolean {
        let program = new InMemoryProgram()
        let mapper = new SamplerInMemoryProgramMapper()
        let data = mapper.mapToSysexData(program)
        let programCreateResult =  midilib.sampler_new_program(programNumber, data)
        let keyGroup = new InMemoryKeyGroup()
        let keyGroupMapper = new SamplerInMemoryKeyGroupMapper()
        let keyGroupData = keyGroupMapper.mapToSysexData(keyGroup)
        let keyGroupCreateResult =  midilib.sampler_new_keygroup(programNumber, 0, keyGroupData)

        return programCreateResult && keyGroupCreateResult
    }

    samplerNewKeyGroup(programNumber: number, keygroupNumber: number): boolean {
        let keyGroup = new InMemoryKeyGroup()
        let keyGroupMapper = new SamplerInMemoryKeyGroupMapper()
        let keyGroupData = keyGroupMapper.mapToSysexData(keyGroup)

        return  midilib.sampler_new_keygroup(programNumber, keygroupNumber, keyGroupData)
    }

    samplerNewSampleFromTemplate(sampleNumber: number, template: string): boolean {
        let sample = new InMemorySample()
        sample.name = "NEW"
        // default - set number of samples and root note based on sample rate of 44100kHz and root note of 440kHz (A)
        let number_of_samples = Math.trunc(44100.0 / 440.0)
        sample.sampleRate = 44100
        sample.sampleLength = number_of_samples - 1
        sample.playLength = number_of_samples - 1
        let sampleMapper = new SamplerInMemorySampleMapper()
        let sampleHeaderData = sampleMapper.mapToSysexData(sample)
        return  midilib.sampler_new_sample_from_template(sampleNumber, template, sampleHeaderData)
    }

    samplerDeleteSample(sampleNumber: number): boolean {
        return midilib.sampler_delete_sample(sampleNumber)
    }

    samplerDeleteKeygroup(programNumber: number, keygroupNumber: number): boolean {
        return midilib.sampler_delete_keygroup(programNumber, keygroupNumber)
    }

    samplerRequestHardDiskDirectoryEntry(entryNumber: number, selector: number): any {
        return midilib.sampler_hard_disk_directory_entry(entryNumber, selector)
    }

    samplerRequestResidentProgramNames(): string[] {
        return midilib.sampler_request_resident_program_names()
    }

    samplerRequestResidentSampleNames(): string[] {
        return midilib.sampler_request_resident_sample_names()
    }

    samplerStatusReport(): any {
        return midilib.sampler_status_report()
    }

    samplerS1000MiscellaneousData(): any {
        return midilib.sampler_s1000_miscellaneous_data()
    }

    samplerMiscellaneousBytes(dataIndex: number, dataBankKnumber: number): boolean {
        return midilib.sampler_request_miscellaneous_bytes(dataIndex, dataBankKnumber)
    }

    samplerChangeProgramMidiChannel(programNumber: number, midiChannel: number): boolean {
        return midilib.sampler_change_program_header(programNumber, 16, [midiChannel])
    }

    samplerChangeProgramHeader(programNumber: number, index: number, value: number): boolean {
        console.log("MidiService.samplerChangeProgramHeader: program number, indexm value", programNumber, index, value)
        let mapper = new SamplerInMemoryProgramMapper()
        let convertedValue = mapper.mapFromUIDataByIndex(index, value)
        console.log("MidiService.samplerChangeProgramHeader: convertedValue", convertedValue)
        return midilib.sampler_change_program_header(programNumber, index, convertedValue)
    }

    samplerChangeKeyGroupHeader(programNumber: number, keygroupNumber: number, index: number, value: number): boolean {
        let mapper = new SamplerInMemoryKeyGroupMapper()
        return midilib.sampler_change_keygroup_header(programNumber, keygroupNumber, index, mapper.mapFromUIDataByIndex(index, value))
    }

    samplerChangeSampleHeader(sample_number: number, index: number, value: number): boolean {
        let mapper = new SamplerInMemorySampleMapper()
        return midilib.sampler_change_sample_header(sample_number, index, mapper.mapFromUIDataByIndex(index, value))
    }

    samplerChangeNameInProgramHeader(programNumber: number, index: number, name: string): boolean {
        let mapper = new SamplerInMemoryProgramMapper()
        return midilib.sampler_change_program_header(programNumber, index, mapper.mapFromUIName(index, name))
    }

    samplerChangeNameInKeyGroupHeader(programNumber: number, keygroupNumber: number, index: number, name: string): boolean {
        let mapper = new SamplerInMemoryKeyGroupMapper()
        return midilib.sampler_change_keygroup_header(programNumber, keygroupNumber, index, mapper.mapFromUIName(index, name))
    }

    samplerChangeNameInSampleHeader(sample_number: number, index: number, name: string): boolean {
        let mapper = new SamplerInMemorySampleMapper()
        return midilib.sampler_change_sample_header(sample_number, index, mapper.mapFromUIName(index, name))
    }
  }
