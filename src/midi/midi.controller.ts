import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  FileDetails,
  MidiService,
  ProgramDetails,
  S1000MiscellaneousDataType,
} from './midi.service';
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

@Controller('midi')
export class MidiController {
  constructor(private midiService: MidiService) {}

  @Get('ports/input')
  getMidiInputPorts(): any {
    return this.midiService.getMidiInputPorts();
  }

  @Get('ports/output')
  getMidiOutputPorts(): any {
    return this.midiService.getMidiOutputPorts();
  }

  @Get('connections')
  getMidiConnections(): any {
    console.log('Getting all midi connections...');
    return this.midiService.getMidiConnections();
  }

  @Post('ports/input/connect/:id')
  connectToInputPort(@Param('id') id: number): boolean {
    console.log('connectToInputPort', id);
    return this.midiService.connectToInputPort(id);
  }

  @Post('ports/output/connect/:id')
  connectToOutputPort(@Param('id') id: number): boolean {
    console.log('connectToOutputPort', id);
    return this.midiService.connectToOutputPort(id);
  }

  @Get('sampler/program/:program_number')
  samplerRequestProgramHeader(
    @Param('program_number') programNumber: number,
  ): InMemoryProgram {
    return this.midiService.samplerRequestProgramHeader(programNumber);
  }

  @Get('sampler/program/:program_number/index/:index/bytes/:bytes')
  samplerRequestProgramHeaderBytes(
    @Param('program_number') programNumber: number,
    @Param('index') index: number,
    @Param('bytes') bytes: number,
  ): number {
    return this.midiService.samplerRequestProgramHeaderBytes(
      programNumber,
      index,
      bytes,
    );
  }

  @Get('sampler/sample/:sample_number')
  samplerRequestSampleHeader(
    @Param('sample_number') sampleNumber: number,
  ): InMemorySample {
    return this.midiService.samplerRequestSampleHeader(sampleNumber);
  }

  @Get('sampler/program/:program_number/keygroup/:keygroup_number')
  samplerRequestKeygroupHeader(
    @Param('program_number') programNumber: number,
    @Param('keygroup_number') keygroupNumber: number,
  ): InMemoryKeyGroup {
    return this.midiService.samplerRequestKeygroupHeader(
      programNumber,
      keygroupNumber,
    );
  }

  @Delete('sampler/program/:program_number')
  samplerDeleteProgram(
    @Param('program_number') programNumber: number,
  ): boolean {
    return this.midiService.samplerDeleteProgram(programNumber);
  }

  @Post('sampler/program/:program_number')
  samplerNewProgram(@Param('program_number') programNumber: number): boolean {
    return this.midiService.samplerNewProgram(programNumber);
  }

  @Post('sampler/program/:program_number/keygroup/:keygroup_number')
  samplerNewKeyGroup(
    @Param('program_number') programNumber: number,
    @Param('keygroup_number') keygroupNumber: number,
  ): boolean {
    return this.midiService.samplerNewKeyGroup(programNumber, keygroupNumber);
  }

  @Post('sampler/sample/:sample_number/template/:template')
  samplerNewSampleFromTemplate(
    @Param('sample_number') sampleNumber: number,
    @Param('template') template: string,
  ): boolean {
    return this.midiService.samplerNewSampleFromTemplate(
      sampleNumber,
      template,
    );
  }

  @Delete('sampler/sample/:sample_number')
  samplerDeleteSample(@Param('sample_number') sampleNumber: number): boolean {
    return this.midiService.samplerDeleteSample(sampleNumber);
  }

  @Delete('sampler/program/:program_number/keygroup/:keygroup_number')
  samplerDeleteKeygroup(
    @Param('program_number') programNumber: number,
    @Param('keygroup_number') keygroupNumber: number,
  ): boolean {
    return this.midiService.samplerDeleteKeygroup(
      programNumber,
      keygroupNumber,
    );
  }

  @Get('sampler/volume-list')
  samplerRequestVolumeList(): any {
    const volumeList = [];
    for (let index = 0; index < 100; index++) {
      const volumeEntry = this.midiService.samplerRequestVolumeListEntry(index);
      if (volumeEntry.active) {
        volumeList.push(volumeEntry);
      } else {
        break;
      }
    }

    return volumeList;
  }

  @Get('sampler/volume-list-entry/:entry_number')
  samplerRequestVolumeListEntry(
    @Param('entry_number') entryNumber: number,
  ): any {
    return this.midiService.samplerRequestVolumeListEntry(entryNumber);
  }

  @Get('sampler/hard-disk-dir-entries-all')
  samplerRequestHardDiskDirectoryEntriesAll(): any {
    return this.midiService.samplerRequestHardDiskDirectoryEntriesAll();
  }

  @Get('sampler/hard-disk-dir')
  samplerRequestHardDiskDirectory(): any {
    const entryList = [];

    // get samples
    let numberOfFiles = this.midiService.samplerMiscellaneousBytes(1, 2); //SINVOL
    for (let entryNumber = 0; entryNumber < numberOfFiles; entryNumber++) {
      const entry = {
        type: 'sample',
        ...this.midiService.samplerRequestHardDiskDirectoryEntry(
          entryNumber,
          2,
        )[0],
      };
      console.log(entry);
      entryList.push(entry);
    }

    // get cue lists
    numberOfFiles = this.midiService.samplerMiscellaneousBytes(2, 2); //QINVOL
    for (let entryNumber = 0; entryNumber < numberOfFiles; entryNumber++) {
      const entry = {
        type: 'cue list',
        ...this.midiService.samplerRequestHardDiskDirectoryEntry(
          entryNumber,
          3,
        )[0],
      };
      console.log(entry);
      entryList.push(entry);
    }

    // get take lists
    numberOfFiles = this.midiService.samplerMiscellaneousBytes(3, 2); //TINVOL
    for (let entryNumber = 0; entryNumber < numberOfFiles; entryNumber++) {
      const entry = {
        type: 'take list',
        ...this.midiService.samplerRequestHardDiskDirectoryEntry(
          entryNumber,
          4,
        )[0],
      };
      console.log(entry);
      entryList.push(entry);
    }

    // get effects file
    numberOfFiles = this.midiService.samplerMiscellaneousBytes(4, 2); //XINVOL
    for (let entryNumber = 0; entryNumber < numberOfFiles; entryNumber++) {
      const entry = {
        type: 'effects file',
        ...this.midiService.samplerRequestHardDiskDirectoryEntry(
          entryNumber,
          5,
        )[0],
      };
      console.log(entry);
      entryList.push(entry);
    }

    // get drum inputs
    numberOfFiles = this.midiService.samplerMiscellaneousBytes(5, 2); //DINVOL
    for (let entryNumber = 0; entryNumber < numberOfFiles; entryNumber++) {
      const entry = {
        type: 'drum inputs',
        ...this.midiService.samplerRequestHardDiskDirectoryEntry(
          entryNumber,
          6,
        )[0],
      };
      console.log(entry);
      entryList.push(entry);
    }

    // get programs
    let programCount = 0;
    numberOfFiles = this.midiService.samplerMiscellaneousBytes(0, 2); //PINVOL
    for (let entryNumber = 0; entryNumber < numberOfFiles; entryNumber++) {
      const entry = {
        ...this.midiService.samplerRequestHardDiskDirectoryEntry(
          entryNumber,
          1,
        )[0],
        type: 'program',
      };
      console.log(entry);
      entryList.splice(programCount, 0, entry);
      programCount++;
    }

    return entryList;
  }

  @Get('sampler/hard-disk-dir-entry/type/:type/entry/:entry_number')
  samplerRequestHardDiskDirectoryEntry(
    @Param('type') selector: number,
    @Param('entry_number') entryNumber: number,
  ): any {
    return this.midiService.samplerRequestHardDiskDirectoryEntry(
      entryNumber,
      selector,
    );
  }

  @Get('sampler/request-resident-program-names')
  samplerRequestResidentProgramNames(): string[] {
    return this.midiService.samplerRequestResidentProgramNames();
  }

  @Get('sampler/request-resident-program-names-with-numbers')
  samplerRequestResidentProgramNamesWithMidiProgramNumbers(): Array<ProgramDetails> {
    return this.midiService.samplerRequestResidentProgramNamesWithMidiProgramNumbers();
  }

  @Get('sampler/request-resident-sample-names')
  samplerRequestResidentSampleNames(): string[] {
    return this.midiService.samplerRequestResidentSampleNames();
  }

  @Get('sampler/all-files-in-memory')
  samplerAllFilesInMemory(): FileDetails[] {
    return this.midiService.samplerAllFilesInMemory();
  }

  @Get('sampler/sampler-status-report')
  samplerStatusReport(): any {
    return this.midiService.samplerStatusReport();
  }

  @Get('sampler/s1000-misc-data')
  samplerS1000MiscellaneousData(): any {
    return this.midiService.samplerS1000MiscellaneousData();
  }

  @Put('sampler/s1000-misc-data')
  samplerChangeS1000MiscellaneousData(
    @Body() s1000_misc_data: S1000MiscellaneousDataType,
  ) {
    if (
      !this.midiService.samplerChangeS1000MiscellaneousData(s1000_misc_data)
    ) {
      throw new HttpException(
        'Sampler did not like s1000 misc data change.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Get(
    'sampler/miscellaneous-bytes/:data_index/data_bank_number/:data_bank_number',
  )
  samplerMiscellaneousBytes(
    @Param('data_index') data_index: number,
    @Param('data_bank_number') data_bank_number: number,
  ): number {
    return this.midiService.samplerMiscellaneousBytes(
      data_index,
      data_bank_number,
    );
  }

  @Put(
    'sampler/miscellaneous-bytes/:data_index/data_bank_number/:data_bank_number/value/:value',
  )
  samplerMiscellaneousBytesUpdate(
    @Param('data_index') data_index: number,
    @Param('data_bank_number') data_bank_number: number,
    @Param('value') value: number,
  ): boolean {
    return this.midiService.samplerMiscellaneousBytesUpdate(
      data_index,
      data_bank_number,
      value,
    );
  }

  @Put('sampler/miscellaneous-bytes/:data_index/name/:name')
  samplerMiscellaneousBytesUpdateName(
    @Param('data_index') data_index: number,
    @Param('name') name: string,
  ): boolean {
    return this.midiService.samplerMiscellaneousBytesUpdateName(
      data_index,
      name,
    );
  }

  @Put(
    'sampler/sampler-change-program-midi-channel/:program_number/midi_channel/:midi_channel',
  )
  samplerChangeProgramMidiChannel(
    @Param('program_number') programNumber: number,
    @Param('midi_channel') midi_channel: number,
  ) {
    if (
      !this.midiService.samplerChangeProgramMidiChannel(
        programNumber,
        midi_channel,
      )
    ) {
      throw new HttpException(
        'Sampler did not like midi channel change for program.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put('sampler/program/:program_number/index/:index/value/:value')
  samplerChangeProgramHeader(
    @Param('program_number') programNumber: number,
    @Param('index') index: number,
    @Param('value') value: number,
  ) {
    console.log(
      'MidiController.samplerChangeProgramHeader: program number, indexm value',
      programNumber,
      index,
      value,
    );
    if (
      !this.midiService.samplerChangeProgramHeader(programNumber, index, value)
    ) {
      throw new HttpException(
        'Sampler did not like change for program.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put(
    'sampler/keygroup/program/:program_number/keygroup/:keygroup_number/index/:index/value/:value',
  )
  samplerChangeKeyGroupHeader(
    @Param('program_number') programNumber: number,
    @Param('keygroup_number') keygroupNumber: number,
    @Param('index') index: number,
    @Param('value') value: number,
  ) {
    if (
      !this.midiService.samplerChangeKeyGroupHeader(
        programNumber,
        keygroupNumber,
        index,
        value,
      )
    ) {
      throw new HttpException(
        'Sampler did not like change for keygroup.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put('sampler/sample/:sample_number/index/:index/value/:value')
  samplerChangeSampleHeader(
    @Param('sample_number') sampleNumber: number,
    @Param('index') index: number,
    @Param('value') value: number,
  ) {
    if (
      !this.midiService.samplerChangeSampleHeader(sampleNumber, index, value)
    ) {
      throw new HttpException(
        'Sampler did not like change for sample.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put('sampler/program/:program_number/index/:index/name/:name')
  samplerChangeNameInProgramHeader(
    @Param('program_number') programNumber: number,
    @Param('index') index: number,
    @Param('name') name: string,
  ) {
    if (
      !this.midiService.samplerChangeNameInProgramHeader(
        programNumber,
        index,
        name,
      )
    ) {
      throw new HttpException(
        'Sampler did not like program name change.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put(
    'sampler/keygroup/program/:program_number/keygroup/:keygroup_number/index/:index/name/:name',
  )
  samplerChangeZoneSampleNameInKeyGroupHeader(
    @Param('program_number') programNumber: number,
    @Param('keygroup_number') keygroupNumber: number,
    @Param('index') index: number,
    @Param('name') name: string,
  ) {
    if (
      !this.midiService.samplerChangeNameInKeyGroupHeader(
        programNumber,
        keygroupNumber,
        index,
        name,
      )
    ) {
      throw new HttpException(
        'Sampler did not like zone sample name change.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put('sampler/sample/:sample_number/index/:index/name/:name')
  samplerChangeNameInSampleHeader(
    @Param('sample_number') sampleNumber: number,
    @Param('index') index: number,
    @Param('name') name: string,
  ) {
    if (
      !this.midiService.samplerChangeNameInSampleHeader(
        sampleNumber,
        index,
        name,
      )
    ) {
      throw new HttpException(
        'Sampler did not like sample name change.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Patch('sampler/floppy')
  samplerSelectFloppy(): boolean {
    if (!this.midiService.samplerSelectFloppy()) {
      throw new HttpException(
        'Sampler failed to select the floppy drive.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Patch('sampler/harddrive')
  samplerSelectHardDrive(): boolean {
    if (!this.midiService.samplerSelectHardDrive()) {
      throw new HttpException(
        'Sampler failed to select the hard drive.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Get('sampler/harddrive/partitions')
  samplerHardDriveNumberOfPartitions(): number {
    return this.midiService.samplerHardDriveNumberOfPartitions();
  }

  @Get('sampler/harddrive/partition')
  samplerHardDriveSelectedPartition(): number {
    return this.midiService.samplerHardDriveSelectedPartition();
  }

  @Patch('sampler/harddrive/partition/:partition')
  samplerSelectHardDrivePartition(
    @Param('partition') partitionNumber: number,
  ): boolean {
    console.log('Weird');
    if (!this.midiService.samplerSelectHardDrivePartition(partitionNumber)) {
      throw new HttpException(
        'Sampler failed to select the hard drive partition: ' + partitionNumber,
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Get('sampler/harddrive/partition/volumes')
  samplerHardDrivePartitionNumberOfVolumes(): number {
    return this.midiService.samplerHardDrivePartitionNumberOfVolumes();
  }

  @Get('sampler/harddrive/partition/volume')
  samplerHardDrivePartitionSelectedVolume(): number {
    return this.midiService.samplerHardDrivePartitionSelectedVolume();
  }

  @Patch('sampler/harddrive/partition/volume/:volume')
  samplerSelectHardDriveVolume(@Param('volume') volumeNumber: number): boolean {
    if (!this.midiService.samplerSelectHardDriveVolume(volumeNumber)) {
      throw new HttpException(
        'Sampler failed to select the hard drive volume: ' + volumeNumber,
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Patch('sampler/clear_memory_and_load_from_selected_volume/:loadtype')
  samplerClearMemoryAndLoadFromSelectedVolume(
    @Param('loadtype') loadType: number,
  ): boolean {
    if (
      !this.midiService.samplerClearMemoryAndLoadFromSelectedVolume(loadType)
    ) {
      throw new HttpException(
        'Sampler failed to clear memory and load from the selected volume into memory.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Patch('sampler/load_from_selected_volume/:loadtype')
  samplerLoadFromSelectedVolume(@Param('loadtype') loadType: number): boolean {
    if (!this.midiService.samplerLoadFromSelectedVolume(loadType)) {
      throw new HttpException(
        'Sampler failed to load from the selected volume into memory.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Patch('sampler/clear_volume_and_save_memory_to_selected_volume/:savetype')
  samplerClearVolumeAndSaveMemoryToSelectedVolume(
    @Param('savetype') saveType: number,
  ): boolean {
    if (
      !this.midiService.samplerClearVolumeAndSaveMemoryToSelectedVolume(
        saveType,
      )
    ) {
      throw new HttpException(
        'Sampler failed to clear volume and save memory to the selected volume.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Patch('sampler/save_memory_to_selected_volume/:savetype')
  samplerSaveMemoryToSelectedVolume(
    @Param('savetype') saveType: number,
  ): boolean {
    if (!this.midiService.samplerSaveMemoryToSelectedVolume(saveType)) {
      throw new HttpException(
        'Sampler failed to save memory to the selected volume.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Patch('sampler/save_memory_to_new_volume/:savetype')
  samplerSaveMemoryToNewVolume(@Param('savetype') saveType: number): boolean {
    if (!this.midiService.samplerSaveMemoryToNewVolume(saveType)) {
      throw new HttpException(
        'Sampler failed to save memory to a new volume.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else return true;
  }

  @Get('sampler/effect-header/filename')
  samplerEffectHeaderFilename(): any {
    return { filename: this.midiService.samplerEffectHeaderFilename() };
  }

  @Patch('sampler/effect-header/filename/:filename')
  samplerEffectHeaderFilenameUpdate(
    @Param('filename') filename: string,
  ): boolean {
    return this.midiService.samplerEffectHeaderFilenameUpdate(filename);
  }

  @Get('sampler/effects')
  samplerEffectsList(): Array<string> {
    return this.midiService.samplerEffectsList();
  }

  @Get('sampler/reverbs')
  samplerReverbsList(): Array<string> {
    return this.midiService.samplerReverbsList();
  }

  @Get('sampler/effect/:effect_number')
  samplerEffect(
    @Param('effect_number') effectNumber: number,
  ): PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect {
    return this.midiService.samplerEffect(effectNumber);
  }

  @Get('sampler/reverb/:reverb_number')
  samplerReverb(@Param('reverb_number') reverbNumber: number): Reverb {
    return this.midiService.samplerReverb(reverbNumber);
  }

  @Put('sampler/effect/:effect_number')
  samplerEffectUpdate(
    @Param('effect_number') effectNumber: number,
    @Body() effect: PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect,
  ): boolean {
    return this.midiService.samplerEffectUpdate(effectNumber, effect);
  }

  @Patch(
    'sampler/effect/:effect_number/effect_type/:effect_type/index/:index/value/:value',
  )
  samplerEffectUpdatePart(
    @Param('effect_type') effectType: number,
    @Param('effect_number') effectNumber: number,
    @Param('index') index: number,
    @Param('value') value: number,
  ) {
    console.log(
      'MidiController.samplerEffectUpdatePart: effect number, index, value',
      effectNumber,
      index,
      value,
    );
    if (
      !this.midiService.samplerEffectUpdatePart(
        effectType,
        effectNumber,
        index,
        value,
      )
    ) {
      throw new HttpException(
        'Sampler did not like part change for effect.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Patch('sampler/effect/:effect_number/name/:name')
  samplerEffectUpdateName(
    @Param('effect_number') effectNumber: number,
    @Param('name') name: string,
  ) {
    console.log(
      'MidiController.samplerEffectUpdateName: effect number, name',
      effectNumber,
      name,
    );
    if (!this.midiService.samplerEffectUpdateName(effectNumber, name)) {
      throw new HttpException(
        'Sampler did not like part name change for effect.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Put('sampler/reverb/:reverb_number')
  samplerReverbUpdate(
    @Param('reverb_number') reverbNumber: number,
    @Body() reverb: Reverb,
  ): boolean {
    return this.midiService.samplerReverbUpdate(reverbNumber, reverb);
  }

  @Patch('sampler/reverb/:reverb_number/index/:index/value/:value')
  samplerReverbUpdatePart(
    @Param('reverb_number') reverbNumber: number,
    @Param('index') index: number,
    @Param('value') value: number,
  ) {
    console.log(
      'MidiController.samplerReverbUpdatePart: reverb number, index, value',
      reverbNumber,
      index,
      value,
    );
    if (!this.midiService.samplerReverbUpdatePart(reverbNumber, index, value)) {
      throw new HttpException(
        'Sampler did not like part change for reverb.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Patch('sampler/reverb/:reverb_number/name/:name')
  samplerReverbUpdateName(
    @Param('reverb_number') reverbNumber: number,
    @Param('name') name: string,
  ) {
    console.log(
      'MidiController.samplerReverbUpdateName: reverb number, name',
      reverbNumber,
      name,
    );
    if (!this.midiService.samplerReverbUpdateName(reverbNumber, name)) {
      throw new HttpException(
        'Sampler did not like name change for reverb.',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  @Get('sampler/program/effect/assignments')
  samplerProgramEffectAssignments(): Array<number> {
    return this.midiService.samplerProgramEffectAssignments();
  }

  @Get('sampler/program/reverb/assignments')
  samplerProgramReverbAssignments(): Array<number> {
    return this.midiService.samplerProgramReverbAssignments();
  }

  @Patch('sampler/assignment/program/:program_number/effect/:effect_number')
  samplerProgramEffectAssignment(
    @Param('program_number') programNumber: number,
    @Param('effect_number') effectNumber: number,
  ): boolean {
    return this.midiService.samplerProgramEffectAssignment(
      programNumber,
      effectNumber,
    );
  }

  @Patch('sampler/assignment/program/:program_number/reverb/:reverb_number')
  samplerProgramReverbAssignment(
    @Param('program_number') programNumber: number,
    @Param('reverb_number') reverbNumber: number,
  ): boolean {
    return this.midiService.samplerProgramReverbAssignment(
      programNumber,
      reverbNumber,
    );
  }
}
