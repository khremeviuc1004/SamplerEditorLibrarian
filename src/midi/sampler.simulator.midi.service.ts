import { Injectable } from '@nestjs/common';
import {
  ChorusEffect,
  DelayEffect,
  DiskAccessReadWrite,
  EchoEffect,
  EffectType,
  Program as InMemoryProgram,
  KeyGroup,
  PitchShiftEffect,
  Program,
  Reverb,
  Sample,
} from '@sampler-editor-librarian/dto';
import { KeyGroup as InMemoryKeyGroup } from '@sampler-editor-librarian/dto';
import { Sample as InMemorySample } from '@sampler-editor-librarian/dto';
import {
  FileDetails,
  MidiService,
  ProgramDetails,
  S1000MiscellaneousDataType,
} from './midi.service';
import { SamplerInMemoryProgramMapper } from 'src/mappers/sampler-program-mapper';
import { SamplerInMemoryKeyGroupMapper } from 'src/mappers/sampler-key-group-mapper';
import { SamplerInMemorySampleMapper } from 'src/mappers/sampler-sample-mapper';
import { SamplerReverbMapper } from 'src/mappers/sampler-reverb-mapper';
import { ChorusEffectMapper } from 'src/mappers/sampler-chorus-effect-mapper';
import { PitchShiftEffectMapper } from 'src/mappers/sampler-pitch-shift-effect-mapper';
import { EchoEffectMapper } from 'src/mappers/sampler-echo-effect-mapper';
import { DelayEffectMapper } from 'src/mappers/sampler-delay-effect-mapper';

type SamplerFile = {
  filename: string;
  data: any | null;
};

type Volume = {
  name: string;
  programs: Array<Program>;
  keygroups: Map<Program, Array<KeyGroup>>;
  samples: Array<Sample>;
  effects_file: SamplerFile;
  drum_inputs: SamplerFile;
  cue_lists: SamplerFile;
  take_lists: SamplerFile;
};

const BASIC_CHANNEL_OMNI = 'basic_channel_omni';
const BASIC_MIDI_CHANNEL = 'basic_midi_channel';
const MIDI_PROGRAM_SELECT_ENABLE = 'midi_program_select_enable';
const SELECTED_PROGRAM_NUMBER = 'selected_program_number';
const MIDI_PLAY_COMMANDS_OMNI_OVERRIDE = 'midi_play_commands_omni_override';
const MIDI_EXLUSIVE_CHANNEL = 'midi_exlusive_channel';

@Injectable()
export class SamplerSimulatorMidiService extends MidiService {
  // hard disk
  partitions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  volumeMap = new Map<string, Array<Volume>>(); // partition is the key

  // memory
  memoryPrograms = new Array<Program>();
  memoryProgramKeygroups = new Map<Program, Array<KeyGroup>>();
  memorySamples = new Array<Sample>();
  miscellaneousData = new Map<string, number>();
  effectsHeaderFilename = 'EFFECTS FILE';
  effects: Array<ChorusEffect | DelayEffect | EchoEffect | PitchShiftEffect> =
    Array.from({ length: 50 }, () => {
      const effectType: EffectType = Math.trunc(Math.random() * (10 - 6) + 6);
      console.log('effectType', effectType);
      switch (effectType) {
        case EffectType.CHORUS:
          return new ChorusEffect();
        case EffectType.PITCH_SHIFT:
          return new PitchShiftEffect();
        case EffectType.ECHO:
          return new EchoEffect();
        case EffectType.DELAY:
          return new DelayEffect();
      }
    });
  effectAssignments = Array.from({ length: 128 }, () => 0);
  reverbs = Array.from({ length: 50 }, () => new Reverb());
  reverbAssignments = Array.from({ length: 128 }, () => 0);
  selectedPartition = 0;
  selectedVolume = 0;
  selectedFileIndex = 0;

  // midi
  midiInputPorts = ['input 1', 'input 2'];
  midiInputConnection: number | null = null;
  midiOutputPorts = ['output 1', 'output 2'];
  midiOutputConnection: number | null = null;

  constructor() {
    super();

    // build the simulator data
    this.createDefaultMemoryData();

    for (
      let partitionIndex = 0;
      partitionIndex < this.partitions.length;
      partitionIndex++
    ) {
      this.createPartition(
        this.partitions[partitionIndex],
        7,
        [2, 3, 4, 5, 6, 7, 8],
        [
          [1, 2],
          [1, 2, 3],
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5],
          [1, 2, 3, 4, 5, 6],
          [1, 2, 3, 4, 5, 6, 7],
          [1, 2, 3, 4, 5, 6, 7, 8],
        ],
      );
    }

    this.createMiscellaneousData();
  }

  private createDefaultMemoryData() {
    const testProgram = new Program();
    testProgram.name = 'TEST';
    this.memoryPrograms.push(testProgram);
    const testProgramKeygroups = new Array<KeyGroup>();
    const sineWaveKeygroup = new KeyGroup();
    sineWaveKeygroup.zone1.sampleName = 'SINE';
    testProgramKeygroups.push(sineWaveKeygroup);
    this.memoryProgramKeygroups.set(testProgram, testProgramKeygroups);
    const sineWaveSample = new Sample();
    sineWaveSample.name = 'SINE';
    this.memorySamples.push(sineWaveSample);
  }

  private createPartition(
    partitionLetter: string,
    numberOfVolumes: number,
    numberOfPrograms: Array<number>,
    numberOfKeygroups: Array<Array<number>>,
  ) {
    // partition volumes
    const partitionVolumes = new Array<Volume>();

    for (let volumeIndex = 0; volumeIndex < numberOfVolumes; volumeIndex++) {
      const volumeNumber = volumeIndex + 1;
      const volume: Volume = this.createVolume(
        partitionLetter + ' ' + 'V' + volumeNumber,
      );
      partitionVolumes.push(volume);

      for (
        let programIndex = 0;
        programIndex < numberOfPrograms[volumeIndex];
        programIndex++
      ) {
        const program = this.createProgram(
          partitionLetter,
          volumeNumber,
          programIndex,
          numberOfKeygroups[volumeIndex][programIndex],
        );
        volume.programs.push(program);

        const programKeygroups = new Array<KeyGroup>();
        volume.keygroups.set(program, programKeygroups);
        for (
          let keygroupIndex = 0;
          keygroupIndex < numberOfKeygroups[volumeIndex][programIndex];
          keygroupIndex++
        ) {
          programKeygroups.push(this.createKeygroup());
        }
      }

      const sineWaveSample = new Sample();
      sineWaveSample.name = 'SINE';
      volume.samples.push(sineWaveSample);

      const sawtoothWaveSample = new Sample();
      sawtoothWaveSample.name = 'SAW';
      volume.samples.push(sawtoothWaveSample);

      const squareWaveSample = new Sample();
      squareWaveSample.name = 'SQUARE';
      volume.samples.push(squareWaveSample);

      const pulseWaveSample = new Sample();
      pulseWaveSample.name = 'PULSE';
      volume.samples.push(pulseWaveSample);
    }

    this.volumeMap.set(partitionLetter, partitionVolumes);
  }

  private createVolume(name: string): Volume {
    return {
      name,
      programs: [],
      keygroups: new Map<Program, Array<KeyGroup>>(),
      samples: [],
      effects_file: {
        filename: 'EFFECTS FILE',
        data: undefined,
      },
      drum_inputs: {
        filename: 'DRUM INPUTS',
        data: null,
      },
      cue_lists: {
        filename: 'CUE LISTS',
        data: null,
      },
      take_lists: {
        filename: 'TAKE LISTS',
        data: null,
      },
    };
  }

  private createProgram(
    partitionLetter: string,
    volumeNumber: number,
    programIndex: number,
    numberOfKeygroups: number,
  ): Program {
    const program = new Program();
    program.name =
      partitionLetter + ' ' + 'V' + volumeNumber + ' P' + (programIndex + 1);
    program.numberOfKeyGroups = numberOfKeygroups;

    return program;
  }

  private createKeygroup(): KeyGroup {
    const keygroup = new KeyGroup();

    keygroup.zone1.sampleName = 'SINE';

    return keygroup;
  }

  private createMiscellaneousData() {
    this.miscellaneousData.set(BASIC_MIDI_CHANNEL, 0);
    this.miscellaneousData.set(BASIC_CHANNEL_OMNI, 0);
    this.miscellaneousData.set(MIDI_PROGRAM_SELECT_ENABLE, 0);
    this.miscellaneousData.set(SELECTED_PROGRAM_NUMBER, 0);
    this.miscellaneousData.set(MIDI_PLAY_COMMANDS_OMNI_OVERRIDE, 0);
    this.miscellaneousData.set(MIDI_EXLUSIVE_CHANNEL, 0);
  }

  getMidiInputPorts(): any {
    return [
      { id: 0, name: this.midiInputPorts[0] },
      { id: 1, name: this.midiInputPorts[1] },
    ];
  }
  getMidiOutputPorts(): any {
    return [
      { id: 0, name: this.midiInputPorts[0] },
      { id: 1, name: this.midiInputPorts[1] },
    ];
  }
  getMidiConnections(): any {
    const connections = [];

    if (this.midiInputConnection) {
      connections.push({
        id: this.midiInputConnection,
        name: this.midiInputPorts[this.midiInputConnection],
        is_input: true,
      });
    }

    if (this.midiOutputConnection) {
      connections.push({
        id: this.midiOutputConnection,
        name: this.midiOutputPorts[this.midiOutputConnection],
        is_input: false,
      });
    }

    return connections;
  }
  connectToInputPort(id: number): boolean {
    if (id < this.midiInputPorts.length) {
      this.midiInputConnection = id;
      return true;
    }

    return false;
  }
  connectToOutputPort(id: number): boolean {
    if (id < this.midiOutputPorts.length) {
      this.midiOutputConnection = id;
      return true;
    }

    return false;
  }
  samplerRequestVolumeListEntry(entryNumber: number): any {
    if (
      entryNumber <
      this.volumeMap.get(this.partitions[this.selectedPartition]).length
    ) {
      const volume = this.volumeMap.get(
        this.partitions[this.selectedPartition],
      )[entryNumber];
      return {
        entry_number: entryNumber,
        entry_name: volume.name,
        active: true,
        type: 3,
      };
    }

    return {
      entry_number: entryNumber,
      entry_name: 'unknown',
      active: false,
      type: 3,
    };
  }
  samplerRequestProgramHeader(programNumber: number): InMemoryProgram {
    return this.memoryPrograms[programNumber];
  }
  samplerRequestProgramHeaderBytes(
    programNumber: number,
    index: number,
    bytes: number,
  ): number {
    throw new Error('Method not implemented.');
  }
  samplerRequestSampleHeader(sample_number: number): InMemorySample {
    return this.memorySamples[sample_number];
  }
  samplerRequestKeygroupHeader(
    programNumber: number,
    keygroupNumber: number,
  ): InMemoryKeyGroup {
    return this.memoryProgramKeygroups.get(this.memoryPrograms[programNumber])[
      keygroupNumber
    ];
  }
  samplerDeleteProgram(programNumber: number): boolean {
    if (this.memoryPrograms.splice(programNumber, 1).length == 1) {
      return true;
    }

    return false;
  }
  samplerNewProgram(programNumber: number): boolean {
    const program = this.createProgram(' ', 0, this.memoryPrograms.length, 1);
    this.memoryPrograms.push(program);
    const keygroup = this.createKeygroup();
    keygroup.zone1.sampleName = 'SINE';
    const programKeygroups = new Array<KeyGroup>();
    programKeygroups.push(keygroup);
    this.memoryProgramKeygroups.set(program, programKeygroups);

    return true;
  }
  samplerNewKeyGroup(programNumber: number, keygroupNumber: number): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        const keygroup = this.createKeygroup();
        keygroup.zone1.sampleName = 'SINE';
        let programKeygroups = this.memoryProgramKeygroups.get(program);

        if (!programKeygroups) {
          programKeygroups = new Array<KeyGroup>();
          this.memoryProgramKeygroups.set(program, programKeygroups);
        }

        programKeygroups.push(keygroup);

        return true;
      }
    }

    return false;
  }
  samplerNewSampleFromTemplate(
    sampleNumber: number,
    template: string,
  ): boolean {
    throw new Error('Method not implemented.');
  }
  samplerDeleteSample(sampleNumber: number): boolean {
    if (sampleNumber < this.memorySamples.length) {
      if (this.memorySamples.splice(sampleNumber, 1).length === 1) {
        return true;
      }
    }

    return false;
  }
  samplerDeleteKeygroup(
    programNumber: number,
    keygroupNumber: number,
  ): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        const programKeygroups = this.memoryProgramKeygroups.get(program);

        if (programKeygroups && keygroupNumber < programKeygroups.length) {
          if (programKeygroups.splice(keygroupNumber, 1).length === 1) {
            return true;
          }
        }
      }
    }

    return false;
  }
  samplerRequestHardDiskDirectoryEntry(
    entryNumber: number,
    selector: number,
  ): any {
    switch (selector) {
      case 1: // programs
        return [
          {
            model: 1,
            file_type: 243,
            name: this.volumeMap.get(this.partitions[this.selectedPartition])[
              this.selectedVolume
            ].programs[entryNumber].name,
          },
        ];
      case 2: // samples
        return [
          {
            model: 1,
            file_type: 243,
            name: this.volumeMap.get(this.partitions[this.selectedPartition])[
              this.selectedVolume
            ].samples[entryNumber].name,
          },
        ];
      case 3: //cue lists
        return [
          {
            model: 1,
            file_type: 243,
            name: this.volumeMap.get(this.partitions[this.selectedPartition])[
              this.selectedVolume
            ].cue_lists.filename,
          },
        ];
      case 4: // take lists
        return [
          {
            model: 1,
            file_type: 243,
            name: this.volumeMap.get(this.partitions[this.selectedPartition])[
              this.selectedVolume
            ].take_lists.filename,
          },
        ];
      case 5: // effects files
        return [
          {
            model: 1,
            file_type: 243,
            name: this.volumeMap.get(this.partitions[this.selectedPartition])[
              this.selectedVolume
            ].effects_file.filename,
          },
        ];
      case 6: // drum input files
        return [
          {
            model: 1,
            file_type: 243,
            name: this.volumeMap.get(this.partitions[this.selectedPartition])[
              this.selectedVolume
            ].drum_inputs.filename,
          },
        ];
      default:
        return [
          {
            model: 1,
            file_type: 243,
            name: 'Unknown',
          },
        ];
    }
  }
  samplerRequestHardDiskDirectoryEntriesAll() {
    throw new Error('Method not implemented.');
  }
  samplerRequestResidentProgramNames(): string[] {
    return this.memoryPrograms.map((program) => program.name);
  }
  samplerRequestResidentProgramNamesWithMidiProgramNumbers(): Array<ProgramDetails> {
    return this.memoryPrograms.map((program) => {
      return {
        midi_program_number: program.midi.programNumber,
        name: program.name,
      };
    });
  }
  samplerRequestResidentSampleNames(): string[] {
    return this.memorySamples.map((sample) => sample.name);
  }
  samplerAllFilesInMemory(): Array<FileDetails> {
    const filesInMemory = new Array<FileDetails>();
    const programNames: Array<string> =
      this.samplerRequestResidentProgramNames();
    const sampleNames: Array<string> = this.samplerRequestResidentSampleNames();
    // FINMEM
    const filesInMemoryCount: number = this.samplerMiscellaneousBytes(10, 2);

    programNames.forEach((programName) =>
      filesInMemory.push({ name: programName, file_type: 'program' }),
    );
    sampleNames.forEach((sampleName) =>
      filesInMemory.push({ name: sampleName, file_type: 'sample' }),
    );

    // cue file name - from the cue list request- QLNAME
    filesInMemory.push({
      name: 'CUE LIST',
      file_type: 'Cue list',
    });

    if (programNames.length + sampleNames.length + 4 === filesInMemoryCount) {
      // take list name - from the take list request - QLNAME (typo in the doco???)
      filesInMemory.push({
        name: 'TAKE LIST',
        file_type: 'Take list',
      });
    }

    // FX file name - need to get this from the fx header - DFXNAME
    filesInMemory.push({
      name: 'EFFECTS FILE',
      file_type: 'Effects',
    });

    filesInMemory.push({
      name: 'DRUM INPUTS',
      file_type: 'Drum inputs',
    });

    return filesInMemory;
  }
  samplerStatusReport(): any {
    return {
      software_version_minor: 7,
      software_version_major: 1,
      max_blocks: 200,
      free_blocks: 200,
      max_sample_words: 50,
      free_words: 50,
      exclusive_channel: 0,
    };
  }
  samplerS1000MiscellaneousData(): any {
    return {
      basic_midi_channel: this.miscellaneousData.get('basic_midi_channel'),
      basic_channel_omni: this.miscellaneousData.get('basic_channel_omni'),
      midi_program_select_enable: this.miscellaneousData.get(
        'midi_program_select_enable',
      ),
      selected_program_number: this.miscellaneousData.get(
        'selected_program_number',
      ),
      midi_play_commands_omni_override: this.miscellaneousData.get(
        'midi_play_commands_omni_override',
      ),
      midi_exlusive_channel: this.miscellaneousData.get(
        'midi_exlusive_channel',
      ),
    };
  }
  samplerChangeS1000MiscellaneousData(
    s1000_misc_data: S1000MiscellaneousDataType,
  ): boolean {
    console.log('samplerChangeS1000MiscellaneousData');
    this.miscellaneousData.set(
      'basic_midi_channel',
      s1000_misc_data.basicMidiChannel,
    );
    this.miscellaneousData.set(
      'basic_channel_omni',
      s1000_misc_data.basicChannelOmni ? 1 : 0,
    );
    this.miscellaneousData.set(
      'midi_program_select_enable',
      s1000_misc_data.midiProgramSelectEnable ? 1 : 0,
    );
    this.miscellaneousData.set(
      'selected_program_number',
      s1000_misc_data.selectedProgramNumber,
    );
    this.miscellaneousData.set(
      'midi_play_commands_omni_override',
      s1000_misc_data.midiPlayCommandsOmniOverride ? 1 : 0,
    );
    this.miscellaneousData.set(
      'midi_exlusive_channel',
      s1000_misc_data.midiExlusiveChannel,
    );

    return true;
  }
  samplerMiscellaneousBytes(dataIndex: number, dataBankNumber: number): number {
    if (dataBankNumber === 2 && dataIndex === 11) {
      return this.selectedFileIndex;
    }
    if (dataBankNumber === 2 && dataIndex === 10) {
      return this.memoryPrograms.length + this.memorySamples.length + 4;
    }
    if (dataIndex === 1 && dataBankNumber === 2) {
      return this.volumeMap.get(this.partitions[this.selectedPartition])[
        this.selectedVolume
      ].samples.length;
    } //SINVOL
    if (dataIndex === 2 && dataBankNumber === 2) {
      return 1;
    } //QINVOL
    if (dataIndex === 3 && dataBankNumber === 2) {
      return 1;
    } //TINVOL
    if (dataIndex === 4 && dataBankNumber === 2) {
      return 1;
    } //XINVOL
    if (dataIndex === 5 && dataBankNumber === 2) {
      return 1;
    } //DINVOL
    if (dataIndex === 0 && dataBankNumber === 2) {
      return this.volumeMap.get(this.partitions[this.selectedPartition])[
        this.selectedVolume
      ].programs.length;
    } //PINVOL

    return 0;
  }
  samplerMiscellaneousBytesUpdate(
    dataIndex: number,
    dataBankNumber: number,
    value: number,
  ): boolean {
    // const BASIC_CHANNEL_OMNI = 'basic_channel_omni';
    // const BASIC_MIDI_CHANNEL = 'basic_midi_channel';
    // const MIDI_PROGRAM_SELECT_ENABLE = 'midi_program_select_enable';
    // const SELECTED_PROGRAM_NUMBER = 'selected_program_number';
    // const MIDI_PLAY_COMMANDS_OMNI_OVERRIDE = 'midi_play_commands_omni_override';
    // const MIDI_EXLUSIVE_CHANNEL = 'midi_exlusive_channel';
    if (dataBankNumber === 2 && dataIndex === 11) {
      this.selectedFileIndex = value;
      return true;
    }
    if (dataBankNumber === 1 && dataIndex === 55) {
      this.miscellaneousData.set(SELECTED_PROGRAM_NUMBER, value);
      return true;
    }
    if (dataBankNumber === 1 && dataIndex === 56) {
      this.miscellaneousData.set(MIDI_EXLUSIVE_CHANNEL, value);
      return true;
    }

    return false;
  }
  samplerMiscellaneousBytesUpdateName(
    dataIndex: number,
    name: string,
  ): boolean {
    // only useful for renaming the drum file???
    throw new Error('Method not implemented.');
  }
  samplerChangeProgramMidiChannel(
    programNumber: number,
    midiChannel: number,
  ): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        program.midi.programNumber = midiChannel;
        return true;
      }
    }

    return false;
  }
  samplerChangeProgramHeader(
    programNumber: number,
    index: number,
    value: number,
  ): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        const mapper = new SamplerInMemoryProgramMapper();
        const changedData = mapper.mapFromUIDataByIndex(index, value);
        const programData = mapper.mapToSysexData(program);

        for (let dataIndex = 0; dataIndex < changedData.length; dataIndex++) {
          programData[index + dataIndex] = changedData[dataIndex];
        }

        mapper.mapFromSysexDataUsingExistingProgram(programData, program);

        return true;
      }
    }

    return false;
  }
  samplerChangeKeyGroupHeader(
    programNumber: number,
    keygroupNumber: number,
    index: number,
    value: number,
  ): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        const programKeygroups = this.memoryProgramKeygroups.get(program);

        if (programKeygroups && keygroupNumber < programKeygroups.length) {
          const keygroup = programKeygroups[keygroupNumber];
          const mapper = new SamplerInMemoryKeyGroupMapper();
          const changedData = mapper.mapFromUIDataByIndex(index, value);
          const keygroupData = mapper.mapToSysexData(keygroup);

          for (let dataIndex = 0; dataIndex < changedData.length; dataIndex++) {
            keygroupData[index + dataIndex] = changedData[dataIndex];
          }

          mapper.mapFromSysexDataUsingExistingKeygroup(keygroupData, keygroup);

          return true;
        }
      }
    }

    return false;
  }
  samplerChangeSampleHeader(
    sample_number: number,
    index: number,
    value: number,
  ): boolean {
    if (sample_number < this.memoryPrograms.length) {
      const sample = this.memorySamples[sample_number];

      if (sample) {
        const mapper = new SamplerInMemorySampleMapper();
        const changedData = mapper.mapFromUIDataByIndex(index, value);
        const sampleData = mapper.mapToSysexData(sample);

        for (let dataIndex = 0; dataIndex < changedData.length; dataIndex++) {
          sampleData[index + dataIndex] = changedData[dataIndex];
        }

        mapper.mapFromSysexDataUsingExistingProgram(sampleData, sample);

        return true;
      }
    }

    return false;
  }
  samplerChangeNameInProgramHeader(
    programNumber: number,
    index: number,
    name: string,
  ): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        program.name = name;
        return true;
      }
    }

    return false;
  }
  samplerChangeNameInKeyGroupHeader(
    programNumber: number,
    keygroupNumber: number,
    index: number,
    name: string,
  ): boolean {
    if (programNumber < this.memoryPrograms.length) {
      const program = this.memoryPrograms[programNumber];

      if (program) {
        const programKeygroups = this.memoryProgramKeygroups.get(program);

        if (programKeygroups && keygroupNumber < programKeygroups.length) {
          const keygroup = programKeygroups[keygroupNumber];
          if (keygroup) {
            switch (index) {
              case 34:
                keygroup.zone1.sampleName = name;
                break;
              case 58:
                keygroup.zone2.sampleName = name;
                break;
              case 82:
                keygroup.zone3.sampleName = name;
                break;
              case 106:
                keygroup.zone4.sampleName = name;
                break;
            }
          }
        }

        return true;
      }
    }

    return false;
  }
  samplerChangeNameInSampleHeader(
    sample_number: number,
    index: number,
    name: string,
  ): boolean {
    if (sample_number < this.memorySamples.length) {
      const sample = this.memorySamples[sample_number];

      if (sample) {
        sample.name = name;
        return true;
      }
    }

    return false;
  }
  samplerSelectFloppy(): boolean {
    return false;
  }
  samplerSelectHardDrive(): boolean {
    return true;
  }
  samplerHardDriveNumberOfPartitions(): number {
    return this.partitions.length;
  }
  samplerHardDriveSelectedPartition(): number {
    return this.selectedPartition;
  }
  samplerSelectHardDrivePartition(partitionNumber: number): boolean {
    if (partitionNumber < this.partitions.length) {
      this.selectedPartition = partitionNumber;

      return true;
    }

    return false;
  }
  samplerSelectHardDriveVolume(volumeNumber: number): boolean {
    const partitionVolumes = this.volumeMap.get(
      this.partitions[this.selectedPartition],
    );
    if (partitionVolumes && volumeNumber < partitionVolumes.length) {
      this.selectedVolume = volumeNumber;

      return true;
    }

    return false;
  }
  samplerHardDrivePartitionNumberOfVolumes(): number {
    const partitionVolumes = this.volumeMap.get(
      this.partitions[this.selectedPartition],
    );
    if (partitionVolumes) {
      return partitionVolumes.length;
    }

    return 0;
  }
  samplerHardDrivePartitionSelectedVolume(): number {
    return this.selectedVolume;
  }
  samplerClearMemoryAndLoadFromSelectedVolume(loadType: number): boolean {
    this.memoryPrograms = new Array<Program>();
    this.memoryProgramKeygroups.clear();
    this.memorySamples = new Array<Sample>();

    if (!this.samplerLoadFromSelectedVolume(loadType)) {
      // need to put something back into memory
      this.createDefaultMemoryData();
    }

    return true;
  }
  samplerLoadFromSelectedVolume(loadType: number): boolean {
    const diskAccess: DiskAccessReadWrite = loadType;
    const volume = this.volumeMap.get(this.partitions[this.selectedPartition])[
      this.selectedVolume
    ];

    switch (diskAccess) {
      case DiskAccessReadWrite.ENTIRE_VOLUME:
        this.memoryPrograms.push(...volume.programs);
        volume.programs.forEach((program) =>
          this.memoryProgramKeygroups.set(
            program,
            volume.keygroups.get(program),
          ),
        );
        this.memorySamples.push(...volume.samples);
        return true;
      case DiskAccessReadWrite.ALL_PROGRAMS_AND_SAMPLES:
        this.memoryPrograms.push(...volume.programs);
        volume.programs.forEach((program) =>
          this.memoryProgramKeygroups.set(
            program,
            volume.keygroups.get(program),
          ),
        );
        this.memorySamples.push(...volume.samples);
        return true;
      case DiskAccessReadWrite.ALL_PROGRAMS:
        this.memoryPrograms.push(...volume.programs);
        volume.programs.forEach((program) =>
          this.memoryProgramKeygroups.set(
            program,
            volume.keygroups.get(program),
          ),
        );
        return true;
      case DiskAccessReadWrite.ALL_SAMPLES:
        this.memorySamples.push(...volume.samples);
        break;
      case DiskAccessReadWrite.OPERATING_SYSTEM:
        return true;
      case DiskAccessReadWrite.CURSOR_PROGRAMS_AND_SAMPLES:
      case DiskAccessReadWrite.CURSOR_ITEM_ONLY:
      default:
        return false;
    }
  }
  samplerClearVolumeAndSaveMemoryToSelectedVolume(saveType: number): boolean {
    const diskAccess: DiskAccessReadWrite = saveType;
    const volume = this.volumeMap.get(this.partitions[this.selectedPartition])[
      this.selectedVolume
    ];

    switch (diskAccess) {
      case DiskAccessReadWrite.ENTIRE_VOLUME:
        volume.programs = [...this.memoryPrograms];
        volume.keygroups.clear();
        this.memoryProgramKeygroups.forEach((keygroups, program) =>
          volume.keygroups.set(program, keygroups),
        );
        volume.samples = [...this.memorySamples];
        return true;
      case DiskAccessReadWrite.ALL_PROGRAMS_AND_SAMPLES:
        volume.programs = [...this.memoryPrograms];
        volume.keygroups.clear();
        this.memoryProgramKeygroups.forEach((keygroups, program) =>
          volume.keygroups.set(program, keygroups),
        );
        volume.samples = [...this.memorySamples];
        return true;
      case DiskAccessReadWrite.ALL_PROGRAMS:
        volume.programs = [...this.memoryPrograms];
        volume.keygroups.clear();
        this.memoryProgramKeygroups.forEach((keygroups, program) =>
          volume.keygroups.set(program, keygroups),
        );
        return true;
      case DiskAccessReadWrite.ALL_SAMPLES:
        volume.samples = [...this.memorySamples];
        return true;
      case DiskAccessReadWrite.OPERATING_SYSTEM:
        return true; // not simulating this
      case DiskAccessReadWrite.CURSOR_PROGRAMS_AND_SAMPLES:
      case DiskAccessReadWrite.CURSOR_ITEM_ONLY:
      default:
        return false;
    }

    return false;
  }
  samplerSaveMemoryToSelectedVolume(saveType: number): boolean {
    const diskAccess: DiskAccessReadWrite = saveType;
    const volume = this.volumeMap.get(this.partitions[this.selectedPartition])[
      this.selectedVolume
    ];

    switch (diskAccess) {
      case DiskAccessReadWrite.ENTIRE_VOLUME:
        volume.programs.push(...this.memoryPrograms);
        this.memoryProgramKeygroups.forEach((keygroups, program) =>
          volume.keygroups.set(program, keygroups),
        );
        volume.samples.push(...this.memorySamples);
        return true;
      case DiskAccessReadWrite.ALL_PROGRAMS_AND_SAMPLES:
        volume.programs.push(...this.memoryPrograms);
        this.memoryProgramKeygroups.forEach((keygroups, program) =>
          volume.keygroups.set(program, keygroups),
        );
        volume.samples.push(...this.memorySamples);
        return true;
      case DiskAccessReadWrite.ALL_PROGRAMS:
        volume.programs.push(...this.memoryPrograms);
        this.memoryProgramKeygroups.forEach((keygroups, program) =>
          volume.keygroups.set(program, keygroups),
        );
        return true;
      case DiskAccessReadWrite.ALL_SAMPLES:
        volume.samples.push(...this.memorySamples);
        return true;
      case DiskAccessReadWrite.OPERATING_SYSTEM:
        return true; // not simulating this
      case DiskAccessReadWrite.CURSOR_PROGRAMS_AND_SAMPLES:
      case DiskAccessReadWrite.CURSOR_ITEM_ONLY:
      default:
        return false;
    }
  }
  samplerSaveMemoryToNewVolume(saveType: number): boolean {
    const partitionLetter = this.partitions[this.selectedPartition];
    const volumeMap = this.volumeMap.get(partitionLetter);
    const volumeNumber = volumeMap.length;
    const volume = this.createVolume(
      partitionLetter + ' ' + 'V' + volumeNumber,
    );

    volumeMap.push(volume);

    this.selectedVolume = volumeNumber;

    this.samplerSaveMemoryToSelectedVolume(saveType);

    return true;
  }
  samplerEffectHeaderFilename(): string {
    return this.effectsHeaderFilename;
  }
  samplerEffectHeaderFilenameUpdate(filename: string): boolean {
    if (filename && filename.trim().length <= 12) {
      this.effectsHeaderFilename = filename;
      return true;
    }

    return false;
  }
  samplerEffectsList(): Array<string> {
    console.log(this.effects);
    return this.effects.map((effect) => {
      console.log(effect);
      return effect.name;
    });
  }
  samplerReverbsList(): Array<string> {
    return this.reverbs.map((reverb) => reverb.name);
  }
  samplerEffect(
    effectNumber: number,
  ): PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect {
    if (effectNumber >= 0 && effectNumber < 50) {
      console.log('Effect: ', this.effects[effectNumber]);
      return this.effects[effectNumber];
    }

    return null;
  }
  samplerReverb(reverbNumber: number): Reverb {
    if (reverbNumber >= 0 && reverbNumber < 50) {
      return this.reverbs[reverbNumber];
    }

    return null;
  }
  samplerEffectUpdate(
    effectNumber: number,
    effect: PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect,
  ): boolean {
    if (effectNumber >= 0 && effectNumber < 50) {
      this.effects.splice(effectNumber, 1, effect);
      return true;
    }

    return false;
  }
  samplerEffectUpdatePart(
    effect_type: number,
    effect_number: number,
    index: number,
    value: number,
  ): boolean {
    if (effect_number >= 0 && effect_number < 50) {
      let mapper = null;
      const effectType: EffectType = effect_type;

      switch (effectType) {
        case EffectType.CHORUS:
          mapper = new ChorusEffectMapper();
          break;
        case EffectType.PITCH_SHIFT:
          mapper = new PitchShiftEffectMapper();
          break;
        case EffectType.ECHO:
          mapper = new EchoEffectMapper();
          break;
        case EffectType.DELAY:
          mapper = new DelayEffectMapper();
          break;
      }

      if (mapper != null) {
        const data = mapper.mapToSysexData(this.reverbs[effect_number]);

        if (index < data.length) {
          mapper.mapFromUIDataByIndex(index, value);
          const effect = mapper.mapFromSysexData(data);
          this.effects.splice(effect_number, 1, effect);
          return true;
        }
      }
    }

    return false;
  }
  samplerEffectUpdateName(effect_number: number, name: string): boolean {
    if (effect_number >= 0 && effect_number < 50 && name && name.length <= 12) {
      this.effects[effect_number].name = name;
      return true;
    }

    return false;
  }
  samplerReverbUpdate(reverbNumber: number, reverb: Reverb): boolean {
    if (reverbNumber >= 0 && reverbNumber < 50) {
      this.reverbs[reverbNumber] = reverb;
      return true;
    }

    return false;
  }
  samplerReverbUpdatePart(
    reverbNumber: number,
    index: number,
    value: number,
  ): boolean {
    if (reverbNumber >= 0 && reverbNumber < 50) {
      const mapper = new SamplerReverbMapper();
      const data = mapper.mapToSysexData(this.reverbs[reverbNumber]);

      if (index < data.length) {
        mapper.mapFromUIDataByIndex(index, value);
        const reverb = mapper.mapFromSysexData(data);
        this.reverbs.splice(reverbNumber, 1, reverb);
        return true;
      }
    }

    return false;
  }
  samplerReverbUpdateName(reverbNumber: number, name: string): boolean {
    if (
      reverbNumber >= 0 &&
      reverbNumber < 50 &&
      name != null &&
      name.trim().length <= 12
    ) {
      this.reverbs[reverbNumber].name = name;
      return true;
    }

    return false;
  }
  samplerProgramEffectAssignments(): Array<number> {
    return this.effectAssignments;
  }
  samplerProgramReverbAssignments(): Array<number> {
    return this.reverbAssignments;
  }
  samplerProgramEffectAssignment(
    programNumber: number,
    effectNumber: number,
  ): boolean {
    if (programNumber >= 0 && programNumber < 128) {
      this.effectAssignments[programNumber] = effectNumber;
      return true;
    }

    return false;
  }
  samplerProgramReverbAssignment(
    programNumber: number,
    reverbNumber: number,
  ): boolean {
    if (programNumber >= 0 && programNumber < 128) {
      this.reverbAssignments[programNumber] = reverbNumber;
      return true;
    }

    return false;
  }
}
