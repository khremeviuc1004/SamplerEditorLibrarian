import { Injectable } from '@nestjs/common';
import {
  ChorusEffect,
  DelayEffect,
  EchoEffect,
  Program as InMemoryProgram,
  PitchShiftEffect,
  Reverb,
} from '@sampler-editor-librarian/dto';
import { KeyGroup as InMemoryKeyGroup } from '@sampler-editor-librarian/dto';
import { Sample as InMemorySample } from '@sampler-editor-librarian/dto';
import { SamplerInMemoryProgramMapper } from '../mappers/sampler-program-mapper';
import { SamplerInMemoryKeyGroupMapper } from '../mappers/sampler-key-group-mapper';
import { SamplerInMemorySampleMapper } from '../mappers/sampler-sample-mapper';
import { SamplerReverbMapper } from 'src/mappers/sampler-reverb-mapper';
import { EffectMapperFactory } from 'src/mappers/sampler-effect-mapper-factory';
import { PitchShiftEffectMapper } from 'src/mappers/sampler-pitch-shift-effect-mapper';
import { ChorusEffectMapper } from 'src/mappers/sampler-chorus-effect-mapper';
import { DelayEffectMapper } from 'src/mappers/sampler-delay-effect-mapper';
import { EchoEffectMapper } from 'src/mappers/sampler-echo-effect-mapper';
import { SamplerEffectMapper } from 'src/mappers/sampler-effect-mapper';
import {
  FileDetails,
  MidiService,
  ProgramDetails,
  S1000MiscellaneousDataType,
} from './midi.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midilib = require('../../index.node');

@Injectable()
export class SamplerMidiService extends MidiService {
  getMidiInputPorts(): any {
    return midilib.list_midi_input_ports();
  }

  getMidiOutputPorts(): any {
    return midilib.list_midi_output_ports();
  }

  getMidiConnections(): any {
    return midilib.list_midi_connections();
  }

  connectToInputPort(id: number): boolean {
    return midilib.connect_to_input_port(id);
  }

  connectToOutputPort(id: number): boolean {
    return midilib.connect_to_output_port(id);
  }

  samplerRequestVolumeListEntry(entryNumber: number): any {
    return midilib.sampler_request_volume_list_entry(entryNumber);
  }

  samplerRequestProgramHeader(programNumber: number): InMemoryProgram {
    const data: Array<number> =
      midilib.sampler_request_program_header(programNumber);
    const mapper = new SamplerInMemoryProgramMapper();
    return mapper.mapFromSysexData(data);
  }

  samplerRequestProgramHeaderBytes(
    programNumber: number,
    index: number,
    bytes: number,
  ): number {
    return midilib.sampler_request_program_header_bytes(
      programNumber,
      index,
      bytes,
    );
  }

  samplerRequestSampleHeader(sample_number: number): InMemorySample {
    const data: Array<number> =
      midilib.sampler_request_sample_header(sample_number);
    const mapper = new SamplerInMemorySampleMapper();
    return mapper.mapFromSysexData(data);
  }

  samplerRequestKeygroupHeader(
    programNumber: number,
    keygroupNumber: number,
  ): InMemoryKeyGroup {
    const data: Array<number> = midilib.sampler_request_keygroup_header(
      programNumber,
      keygroupNumber,
    );
    const mapper = new SamplerInMemoryKeyGroupMapper();
    return mapper.mapFromSysexData(data);
  }

  samplerDeleteProgram(programNumber: number): boolean {
    return midilib.sampler_delete_program(programNumber);
  }

  samplerNewProgram(programNumber: number): boolean {
    // create the new program
    const program = new InMemoryProgram();
    const mapper = new SamplerInMemoryProgramMapper();
    const data = mapper.mapToSysexData(program);
    const programCreateResult = midilib.sampler_new_program(
      programNumber,
      data,
    );

    // create the new keygroup - using the the special program number of 255 which associates the new keygroup with the just created program
    const keyGroup = new InMemoryKeyGroup();
    const keyGroupMapper = new SamplerInMemoryKeyGroupMapper();
    const keyGroupData = keyGroupMapper.mapToSysexData(keyGroup);
    const keyGroupCreateResult = midilib.sampler_new_keygroup(
      255,
      0,
      keyGroupData,
    );

    return programCreateResult && keyGroupCreateResult;
  }

  samplerNewKeyGroup(programNumber: number, keygroupNumber: number): boolean {
    const keyGroup = new InMemoryKeyGroup();
    console.log(
      'New keygroup: span low={}, spam high={}',
      keyGroup.span.lowNote,
      keyGroup.span.highNote,
    );
    const keyGroupMapper = new SamplerInMemoryKeyGroupMapper();
    const keyGroupData = keyGroupMapper.mapToSysexData(keyGroup);
    console.log(
      'New keygroup binary data: span low={}, spam high={}',
      keyGroupData[3],
      keyGroupData[4],
    );

    return midilib.sampler_new_keygroup(
      programNumber,
      keygroupNumber,
      keyGroupData,
    );
  }

  samplerNewSampleFromTemplate(
    sampleNumber: number,
    template: string,
  ): boolean {
    const sample = new InMemorySample();
    sample.name = 'NEW';
    // default - set number of samples and root note based on sample rate of 44100kHz and root note of 440kHz (A)
    const number_of_samples = Math.trunc(44100.0 / 440.0);
    sample.sampleRate = 44100;
    sample.sampleLength = number_of_samples - 1;
    sample.playLength = number_of_samples - 1;
    const sampleMapper = new SamplerInMemorySampleMapper();
    const sampleHeaderData = sampleMapper.mapToSysexData(sample);
    return midilib.sampler_new_sample_from_template(
      sampleNumber,
      template,
      sampleHeaderData,
    );
  }

  samplerDeleteSample(sampleNumber: number): boolean {
    return midilib.sampler_delete_sample(sampleNumber);
  }

  samplerDeleteKeygroup(
    programNumber: number,
    keygroupNumber: number,
  ): boolean {
    return midilib.sampler_delete_keygroup(programNumber, keygroupNumber);
  }

  samplerRequestHardDiskDirectoryEntry(
    entryNumber: number,
    selector: number,
  ): any {
    return midilib.sampler_hard_disk_directory_entries(
      selector,
      entryNumber,
      1,
    );
  }

  samplerRequestHardDiskDirectoryEntriesAll(): any {
    const numberOfFilesInDiskVolume: number =
      midilib.sampler_request_miscellaneous_bytes(6, 2);
    console.log(
      'Number of files in selected disk volume: ',
      numberOfFilesInDiskVolume,
    );
    return midilib.sampler_hard_disk_directory_entries(
      1,
      0,
      numberOfFilesInDiskVolume,
    );
  }

  samplerRequestResidentProgramNames(): string[] {
    return midilib.sampler_request_resident_program_names();
  }

  samplerRequestResidentProgramNamesWithMidiProgramNumbers(): Array<ProgramDetails> {
    const programNames: Array<string> =
      midilib.sampler_request_resident_program_names();
    const programDetails = new Array<ProgramDetails>();

    programNames.forEach((programName, index) =>
      programDetails.push({
        midi_program_number: midilib.sampler_request_program_header_bytes(
          index,
          15,
          1,
        ),
        name: programName,
      }),
    );

    return programDetails;
  }

  samplerRequestResidentSampleNames(): string[] {
    return midilib.sampler_request_resident_sample_names();
  }

  samplerAllFilesInMemory(): Array<FileDetails> {
    const filesInMemory = new Array<FileDetails>();
    const programNames: Array<string> =
      midilib.sampler_request_resident_program_names();
    const sampleNames: Array<string> =
      midilib.sampler_request_resident_sample_names();
    // FINMEM
    const filesInMemoryCount: number =
      midilib.sampler_request_miscellaneous_bytes(10, 2);

    programNames.forEach((programName) =>
      filesInMemory.push({ name: programName, file_type: 'program' }),
    );
    sampleNames.forEach((sampleName) =>
      filesInMemory.push({ name: sampleName, file_type: 'sample' }),
    );

    // cue file name - from the cue list request- QLNAME
    const cueListFileName = midilib.sampler_request_cuelist_file_name();
    filesInMemory.push({
      name: cueListFileName,
      file_type: 'Cue list',
    });

    if (programNames.length + sampleNames.length + 4 === filesInMemoryCount) {
      // take list name - from the take list request - QLNAME (typo in the doco???)
      const takeListFileName = midilib.sampler_request_take_list_file_name();
      filesInMemory.push({
        name: takeListFileName,
        file_type: 'Take list',
      });
    }

    // FX file name - need to get this from the fx header - DFXNAME
    const fxFileName = midilib.sampler_request_fx_file_name();
    filesInMemory.push({
      name: fxFileName,
      file_type: 'Effects',
    });

    const drumFileName: string =
      midilib.sampler_request_miscellaneous_bytes_name(1);
    filesInMemory.push({
      name: drumFileName,
      file_type: 'Drum inputs',
    });

    return filesInMemory;
  }

  samplerStatusReport(): any {
    return midilib.sampler_status_report();
  }

  samplerS1000MiscellaneousData(): any {
    return midilib.sampler_s1000_miscellaneous_data();
  }

  samplerChangeS1000MiscellaneousData(
    s1000_misc_data: S1000MiscellaneousDataType,
  ): boolean {
    return midilib.sampler_change_s1000_misc_bytes(
      s1000_misc_data.basicMidiChannel,
      s1000_misc_data.basicChannelOmni ? 1 : 0,
      s1000_misc_data.midiProgramSelectEnable ? 1 : 0,
      s1000_misc_data.selectedProgramNumber,
      s1000_misc_data.midiPlayCommandsOmniOverride ? 1 : 0,
      s1000_misc_data.midiExlusiveChannel,
    );
  }

  samplerMiscellaneousBytes(dataIndex: number, dataBankNumber: number): number {
    return midilib.sampler_request_miscellaneous_bytes(
      dataIndex,
      dataBankNumber,
    );
  }

  samplerMiscellaneousBytesUpdate(
    dataIndex: number,
    dataBankNumber: number,
    value: number,
  ): boolean {
    return midilib.sampler_request_miscellaneous_bytes_update(
      dataIndex,
      dataBankNumber,
      value,
    );
  }

  samplerMiscellaneousBytesUpdateName(
    dataIndex: number,
    name: string,
  ): boolean {
    return midilib.sampler_request_miscellaneous_bytes_update_name(
      dataIndex,
      name,
    );
  }

  samplerChangeProgramMidiChannel(
    programNumber: number,
    midiChannel: number,
  ): boolean {
    return midilib.sampler_change_program_header(programNumber, 16, [
      midiChannel,
    ]);
  }

  samplerChangeProgramHeader(
    programNumber: number,
    index: number,
    value: number,
  ): boolean {
    console.log(
      'MidiService.samplerChangeProgramHeader: program number, indexm value',
      programNumber,
      index,
      value,
    );
    const mapper = new SamplerInMemoryProgramMapper();
    const convertedValue = mapper.mapFromUIDataByIndex(index, value);
    console.log(
      'MidiService.samplerChangeProgramHeader: convertedValue',
      convertedValue,
    );
    return midilib.sampler_change_program_header(
      programNumber,
      index,
      convertedValue,
    );
  }

  samplerChangeKeyGroupHeader(
    programNumber: number,
    keygroupNumber: number,
    index: number,
    value: number,
  ): boolean {
    const mapper = new SamplerInMemoryKeyGroupMapper();
    return midilib.sampler_change_keygroup_header(
      programNumber,
      keygroupNumber,
      index,
      mapper.mapFromUIDataByIndex(index, value),
    );
  }

  samplerChangeSampleHeader(
    sample_number: number,
    index: number,
    value: number,
  ): boolean {
    const mapper = new SamplerInMemorySampleMapper();
    return midilib.sampler_change_sample_header(
      sample_number,
      index,
      mapper.mapFromUIDataByIndex(index, value),
    );
  }

  samplerChangeNameInProgramHeader(
    programNumber: number,
    index: number,
    name: string,
  ): boolean {
    const mapper = new SamplerInMemoryProgramMapper();
    return midilib.sampler_change_program_header(
      programNumber,
      index,
      mapper.mapFromUIName(index, name),
    );
  }

  samplerChangeNameInKeyGroupHeader(
    programNumber: number,
    keygroupNumber: number,
    index: number,
    name: string,
  ): boolean {
    const mapper = new SamplerInMemoryKeyGroupMapper();
    return midilib.sampler_change_keygroup_header(
      programNumber,
      keygroupNumber,
      index,
      mapper.mapFromUIName(index, name),
    );
  }

  samplerChangeNameInSampleHeader(
    sample_number: number,
    index: number,
    name: string,
  ): boolean {
    const mapper = new SamplerInMemorySampleMapper();
    return midilib.sampler_change_sample_header(
      sample_number,
      index,
      mapper.mapFromUIName(index, name),
    );
  }

  samplerSelectFloppy(): boolean {
    return midilib.sampler_select_floppy();
  }

  samplerSelectHardDrive(): boolean {
    return midilib.sampler_select_harddrive();
  }

  samplerHardDriveNumberOfPartitions(): number {
    return midilib.sampler_harddrive_number_of_partitions();
  }

  samplerHardDriveSelectedPartition(): number {
    return midilib.sampler_harddrive_selected_partition();
  }

  samplerSelectHardDrivePartition(partitionNumber: number): boolean {
    return midilib.sampler_select_harddrive_partition(partitionNumber);
  }

  samplerSelectHardDriveVolume(volumeNumber: number): boolean {
    return midilib.sampler_select_harddrive_volume(volumeNumber);
  }

  samplerHardDrivePartitionNumberOfVolumes(): number {
    return midilib.sampler_harddrive_partition_number_of_volumes();
  }

  samplerHardDrivePartitionSelectedVolume(): number {
    return midilib.sampler_harddrive_partition_selected_volume();
  }

  samplerClearMemoryAndLoadFromSelectedVolume(loadType: number): boolean {
    return midilib.sampler_clear_memory_and_load_from_selected_volume(loadType);
  }

  samplerLoadFromSelectedVolume(loadType: number): boolean {
    return midilib.sampler_load_from_selected_volume(loadType);
  }

  samplerClearVolumeAndSaveMemoryToSelectedVolume(saveType: number): boolean {
    return midilib.sampler_clear_volume_and_save_memory_to_selected_volume(
      saveType,
    );
  }

  samplerSaveMemoryToSelectedVolume(saveType: number): boolean {
    return midilib.sampler_save_memory_to_selected_volume(saveType);
  }

  samplerSaveMemoryToNewVolume(saveType: number): boolean {
    return midilib.sampler_save_memory_to_new_volume(saveType);
  }

  samplerEffectHeaderFilename(): string {
    return midilib.sampler_request_fx_file_name();
  }

  samplerEffectHeaderFilenameUpdate(filename: string): boolean {
    return midilib.sampler_effect_header_filename_update(filename);
  }

  samplerEffectsList(): Array<string> {
    return midilib.sampler_effects_list();
  }

  samplerReverbsList(): Array<string> {
    return midilib.sampler_reverbs_list();
  }

  samplerEffect(
    effectNumber: number,
  ): PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect {
    const data: Array<number> = midilib.sampler_effect(effectNumber);
    const mapper = EffectMapperFactory.createMapperFromEffectType(data[13]);
    return mapper.mapFromSysexData(data);
  }

  samplerReverb(reverbNumber: number): Reverb {
    const data: Array<number> = midilib.sampler_reverb(reverbNumber);
    const mapper = new SamplerReverbMapper();
    return mapper.mapFromSysexData(data);
  }

  samplerEffectUpdate(
    effectNumber: number,
    effect: PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect,
  ): boolean {
    // let mapper = EffectMapperFactory.createMapperFromEffectType(effect.type)
    let mapper = null;

    if (effect instanceof PitchShiftEffect) {
      mapper = new PitchShiftEffectMapper();
    } else if (effect instanceof ChorusEffect) {
      mapper = new ChorusEffectMapper();
    } else if (effect instanceof DelayEffect) {
      mapper = new DelayEffectMapper();
    } else {
      mapper = new EchoEffectMapper();
    }

    const data: Array<number> = mapper.mapToSysexData(effect);

    console.log(data);

    return midilib.sampler_effect_update(effectNumber, data);
  }

  samplerEffectUpdatePart(
    effect_type: number,
    effect_number: number,
    index: number,
    value: number,
  ): boolean {
    const mapper = EffectMapperFactory.createMapperFromEffectType(effect_type);
    const data = mapper.mapFromUIDataByIndex(index, value);

    console.log('data', data);

    return midilib.sampler_effect_update_part(
      effect_number,
      index,
      mapper.mapFromUIDataByIndex(index, value),
    );
  }

  samplerEffectUpdateName(effect_number: number, name: string): boolean {
    const mapper = new SamplerEffectMapper();
    const data = mapper.mapFromUIName(0, name);
    console.log('samplerEffectUpdateName: name={}', data);
    return midilib.sampler_effect_update_part(effect_number, 0, data);
  }

  samplerReverbUpdate(reverbNumber: number, reverb: Reverb): boolean {
    const mapper = new SamplerReverbMapper();
    const data: Array<number> = mapper.mapToSysexData(reverb);
    return midilib.sampler_reverb_update(reverbNumber, data);
  }

  samplerReverbUpdatePart(
    reverbNumber: number,
    index: number,
    value: number,
  ): boolean {
    const mapper = new SamplerReverbMapper();
    return midilib.sampler_reverb_update_part(
      reverbNumber,
      index,
      mapper.mapFromUIDataByIndex(index, value),
    );
  }

  samplerReverbUpdateName(reverbNumber: number, name: string): boolean {
    const mapper = new SamplerReverbMapper();
    return midilib.sampler_reverb_update_part(
      reverbNumber,
      0,
      mapper.mapFromUIName(0, name),
    );
  }

  samplerProgramEffectAssignments(): Array<number> {
    return midilib.sampler_program_effect_assignments();
  }

  samplerProgramReverbAssignments(): Array<number> {
    return midilib.sampler_program_reverb_assignments();
  }

  samplerProgramEffectAssignment(
    programNumber: number,
    effectNumber: number,
  ): boolean {
    return midilib.sampler_program_effect_assignment(
      programNumber,
      effectNumber,
    );
  }

  samplerProgramReverbAssignment(
    programNumber: number,
    reverbNumber: number,
  ): boolean {
    return midilib.sampler_program_reverb_assignment(
      programNumber,
      reverbNumber,
    );
  }
}
