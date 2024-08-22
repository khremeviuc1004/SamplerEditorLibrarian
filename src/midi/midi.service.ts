import { Injectable } from '@nestjs/common'
import { ChorusEffect, DelayEffect, EchoEffect, Effect, Program as InMemoryProgram, PitchShiftEffect, Reverb } from '@sampler-editor-librarian/dto';
import { KeyGroup as InMemoryKeyGroup } from '@sampler-editor-librarian/dto';
import { Sample as InMemorySample } from '@sampler-editor-librarian/dto';
import { SamplerInMemoryProgramMapper } from '../mappers/sampler-program-mapper'
import { SamplerInMemoryKeyGroupMapper } from '../mappers/sampler-key-group-mapper'
import { SamplerInMemorySampleMapper } from '../mappers/sampler-sample-mapper'
import { SamplerReverbMapper } from 'src/mappers/sampler-reverb-mapper';
import { EffectMapperFactory } from 'src/mappers/sampler-effect-mapper-factory';
import { PitchShiftEffectMapper } from 'src/mappers/sampler-pitch-shift-effect-mapper';
import { ChorusEffectMapper } from 'src/mappers/sampler-chorus-effect-mapper';
import { DelayEffectMapper } from 'src/mappers/sampler-delay-effect-mapper';
import { EchoEffectMapper } from 'src/mappers/sampler-echo-effect-mapper';
const midilib = require('../../index.node')

export class S1000MiscellaneousDataType {
    selectedProgramNumber: number;
    midiPlayCommandsOmniOverride: boolean;
    basicChannelOmni: boolean;
    basicMidiChannel: number;
    midiProgramSelectEnable: boolean;
    midiExlusiveChannel: number;
}

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
        // create the new program
        let program = new InMemoryProgram()
        let mapper = new SamplerInMemoryProgramMapper()
        let data = mapper.mapToSysexData(program)
        let programCreateResult =  midilib.sampler_new_program(programNumber, data)

        // create the new keygroup - using the the special program number of 255 which associates the new keygroup with the just created program
        let keyGroup = new InMemoryKeyGroup()
        let keyGroupMapper = new SamplerInMemoryKeyGroupMapper()
        let keyGroupData = keyGroupMapper.mapToSysexData(keyGroup)
        let keyGroupCreateResult =  midilib.sampler_new_keygroup(255, 0, keyGroupData)

        return programCreateResult && keyGroupCreateResult
    }

    samplerNewKeyGroup(programNumber: number, keygroupNumber: number): boolean {
        let keyGroup = new InMemoryKeyGroup()
        console.log("New keygroup: span low={}, spam high={}", keyGroup.span.lowNote, keyGroup.span.highNote)
        let keyGroupMapper = new SamplerInMemoryKeyGroupMapper()
        let keyGroupData = keyGroupMapper.mapToSysexData(keyGroup)
        console.log("New keygroup binary data: span low={}, spam high={}", keyGroupData[3], keyGroupData[4])

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

    samplerChangeS1000MiscellaneousData(s1000_misc_data: S1000MiscellaneousDataType): boolean {
        return midilib.sampler_change_s1000_misc_bytes(
            s1000_misc_data.basicMidiChannel,
            s1000_misc_data.basicChannelOmni ? 1 : 0,
            s1000_misc_data.midiProgramSelectEnable ? 1 : 0,
            s1000_misc_data.selectedProgramNumber,
            s1000_misc_data.midiPlayCommandsOmniOverride ? 1 : 0,
            s1000_misc_data.midiExlusiveChannel,
        )
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

    samplerSelectFloppy() :boolean {
        return midilib.sampler_select_floppy()
    }

    samplerSelectHardDrive() :boolean {
        return midilib.sampler_select_harddrive()
    }

    samplerHardDriveNumberOfPartitions() :number {
        return midilib.sampler_harddrive_number_of_partitions()
    }

    samplerHardDriveSelectedPartition() :number {
        return midilib.sampler_harddrive_selected_partition()
    }

    samplerSelectHardDrivePartition(partitionNumber: number) :boolean {
        return midilib.sampler_select_harddrive_partition(partitionNumber)
    }

    samplerSelectHardDriveVolume(volumeNumber: number) :boolean {
        return midilib.sampler_select_harddrive_volume(volumeNumber)
    }

    samplerHardDrivePartitionNumberOfVolumes() :number {
        return midilib.sampler_harddrive_partition_number_of_volumes()
    }

    samplerHardDrivePartitionSelectedVolume() :number {
        return midilib.sampler_harddrive_partition_selected_volume()
    }

    samplerClearMemoryAndLoadFromSelectedVolume(loadType: number) :boolean {
        return midilib.sampler_clear_memory_and_load_from_selected_volume(loadType)
    }

    samplerLoadFromSelectedVolume(loadType: number) :boolean {
        return midilib.sampler_load_from_selected_volume(loadType)
    }

    samplerClearVolumeAndSaveMemoryToSelectedVolume(saveType: number) :boolean {
        return midilib.sampler_clear_volume_and_save_memory_to_selected_volume(saveType)
    }

    samplerSaveMemoryToSelectedVolume(saveType: number) :boolean {
        return midilib.sampler_save_memory_to_selected_volume(saveType)
    }

    samplerEffectsList(): Array<String> {
        return midilib.sampler_effects_list()
    }

    samplerReverbsList(): Array<String> {
        return midilib.sampler_reverbs_list()
    }

    samplerEffect(effectNumber: number): PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect {
        let data: Array<number> =  midilib.sampler_effect(effectNumber)
        let mapper = EffectMapperFactory.createMapperFromEffectType(data[13])
        return mapper.mapFromSysexData(data)
    }

    samplerReverb(reverbNumber: number): Reverb {
        let data: Array<number> = midilib.sampler_reverb(reverbNumber)
        let mapper = new SamplerReverbMapper()
        return mapper.mapFromSysexData(data)
    }

    samplerEffectUpdate(effectNumber: number, effect: PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect): boolean {
        // let mapper = EffectMapperFactory.createMapperFromEffectType(effect.type)
        let mapper = null;
        
        if (effect instanceof PitchShiftEffect) {
            mapper =  new PitchShiftEffectMapper();
        } else if (effect instanceof ChorusEffect) {
            mapper = new ChorusEffectMapper();
        } else if (effect instanceof DelayEffect) {
            mapper = new DelayEffectMapper();
        } else {
            mapper = new EchoEffectMapper();
        }      
        
        let data: Array<number> = mapper.mapToSysexData(effect)

        console.log(data)

        return midilib.sampler_effect_update(effectNumber, data)
    }

    samplerEffectUpdatePart(effect_type: number, effect_number: number, index: number, value: number): boolean {
        let mapper = EffectMapperFactory.createMapperFromEffectType(effect_type)

        return midilib.sampler_effect_update_part(effect_number, index, mapper.mapFromUIDataByIndex(index, value))
    }

    samplerReverbUpdate(reverbNumber: number, reverb: Reverb): boolean {
        let mapper = new SamplerReverbMapper()
        let data: Array<number> = mapper.mapToSysexData(reverb)
        return midilib.sampler_reverb_update(reverbNumber, data)
    }

    samplerReverbUpdatePart(reverbNumber: number, index: number, value: number): boolean {
        let mapper = new SamplerReverbMapper()
        return midilib.sampler_reverb_update_part(reverbNumber, index, mapper.mapFromUIDataByIndex(index, value))
    }

    samplerProgramEffectAssignments(): Array<number> {
        return midilib.sampler_program_effect_assignments()
    }

    samplerProgramReverbAssignments(): Array<number> {
        return midilib.sampler_program_reverb_assignments()
    }

    samplerProgramEffectAssignment(programNumber: number, effectNumber: number): boolean {
        return midilib.sampler_program_effect_assignment(programNumber, effectNumber)
    }

    samplerProgramReverbAssignment(programNumber: number, reverbNumber: number): boolean {
        return midilib.sampler_program_reverb_assignment(programNumber, reverbNumber)
    }
}
