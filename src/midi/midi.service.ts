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

export class S1000MiscellaneousDataType {
  selectedProgramNumber: number;
  midiPlayCommandsOmniOverride: boolean;
  basicChannelOmni: boolean;
  basicMidiChannel: number;
  midiProgramSelectEnable: boolean;
  midiExlusiveChannel: number;
}

export type FileDetails = {
  name: string;
  file_type: string;
};

export type ProgramDetails = {
  midi_program_number: number;
  name: string;
};

@Injectable()
export abstract class MidiService {
  abstract getMidiInputPorts(): any;
  abstract getMidiOutputPorts(): any;
  abstract getMidiConnections(): any;
  abstract connectToInputPort(id: number): boolean;
  abstract connectToOutputPort(id: number): boolean;
  abstract samplerRequestVolumeListEntry(entryNumber: number): any;
  abstract samplerRequestProgramHeader(programNumber: number): InMemoryProgram;
  abstract samplerRequestProgramHeaderBytes(
    programNumber: number,
    index: number,
    bytes: number,
  ): number;
  abstract samplerRequestSampleHeader(sample_number: number): InMemorySample;
  abstract samplerRequestKeygroupHeader(
    programNumber: number,
    keygroupNumber: number,
  ): InMemoryKeyGroup;
  abstract samplerDeleteProgram(programNumber: number): boolean;
  abstract samplerNewProgram(programNumber: number): boolean;
  abstract samplerNewKeyGroup(
    programNumber: number,
    keygroupNumber: number,
  ): boolean;
  abstract samplerNewSampleFromTemplate(
    sampleNumber: number,
    template: string,
  ): boolean;
  abstract samplerDeleteSample(sampleNumber: number): boolean;
  abstract samplerDeleteKeygroup(
    programNumber: number,
    keygroupNumber: number,
  ): boolean;
  abstract samplerRequestHardDiskDirectoryEntry(
    entryNumber: number,
    selector: number,
  ): any;
  abstract samplerRequestHardDiskDirectoryEntriesAll(): any;
  abstract samplerRequestResidentProgramNames(): string[];
  abstract samplerRequestResidentProgramNamesWithMidiProgramNumbers(): Array<ProgramDetails>;
  abstract samplerRequestResidentSampleNames(): string[];
  abstract samplerAllFilesInMemory(): Array<FileDetails>;
  abstract samplerStatusReport(): any;
  abstract samplerS1000MiscellaneousData(): any;
  abstract samplerChangeS1000MiscellaneousData(
    s1000_misc_data: S1000MiscellaneousDataType,
  ): boolean;
  abstract samplerMiscellaneousBytes(
    dataIndex: number,
    dataBankNumber: number,
  ): number;
  abstract samplerMiscellaneousBytesUpdate(
    dataIndex: number,
    dataBankNumber: number,
    value: number,
  ): boolean;
  abstract samplerMiscellaneousBytesUpdateName(
    dataIndex: number,
    name: string,
  ): boolean;
  abstract samplerChangeProgramMidiChannel(
    programNumber: number,
    midiChannel: number,
  ): boolean;
  abstract samplerChangeProgramHeader(
    programNumber: number,
    index: number,
    value: number,
  ): boolean;
  abstract samplerChangeKeyGroupHeader(
    programNumber: number,
    keygroupNumber: number,
    index: number,
    value: number,
  ): boolean;
  abstract samplerChangeSampleHeader(
    sample_number: number,
    index: number,
    value: number,
  ): boolean;
  abstract samplerChangeNameInProgramHeader(
    programNumber: number,
    index: number,
    name: string,
  ): boolean;
  abstract samplerChangeNameInKeyGroupHeader(
    programNumber: number,
    keygroupNumber: number,
    index: number,
    name: string,
  ): boolean;
  abstract samplerChangeNameInSampleHeader(
    sample_number: number,
    index: number,
    name: string,
  ): boolean;
  abstract samplerSelectFloppy(): boolean;
  abstract samplerSelectHardDrive(): boolean;
  abstract samplerHardDriveNumberOfPartitions(): number;
  abstract samplerHardDriveSelectedPartition(): number;
  abstract samplerSelectHardDrivePartition(partitionNumber: number): boolean;
  abstract samplerSelectHardDriveVolume(volumeNumber: number): boolean;
  abstract samplerHardDrivePartitionNumberOfVolumes(): number;
  abstract samplerHardDrivePartitionSelectedVolume(): number;
  abstract samplerClearMemoryAndLoadFromSelectedVolume(
    loadType: number,
  ): boolean;
  abstract samplerLoadFromSelectedVolume(loadType: number): boolean;
  abstract samplerClearVolumeAndSaveMemoryToSelectedVolume(
    saveType: number,
  ): boolean;
  abstract samplerSaveMemoryToSelectedVolume(saveType: number): boolean;
  abstract samplerSaveMemoryToNewVolume(saveType: number): boolean;
  abstract samplerEffectHeaderFilename(): string;
  abstract samplerEffectHeaderFilenameUpdate(filename: string): boolean;
  abstract samplerEffectsList(): Array<string>;
  abstract samplerReverbsList(): Array<string>;
  abstract samplerEffect(
    effectNumber: number,
  ): PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect;
  abstract samplerReverb(reverbNumber: number): Reverb;
  abstract samplerEffectUpdate(
    effectNumber: number,
    effect: PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect,
  ): boolean;
  abstract samplerEffectUpdatePart(
    effect_type: number,
    effect_number: number,
    index: number,
    value: number,
  ): boolean;
  abstract samplerEffectUpdateName(
    effect_number: number,
    name: string,
  ): boolean;
  abstract samplerReverbUpdate(reverbNumber: number, reverb: Reverb): boolean;
  abstract samplerReverbUpdatePart(
    reverbNumber: number,
    index: number,
    value: number,
  ): boolean;
  abstract samplerReverbUpdateName(reverbNumber: number, name: string): boolean;
  abstract samplerProgramEffectAssignments(): Array<number>;
  abstract samplerProgramReverbAssignments(): Array<number>;
  abstract samplerProgramEffectAssignment(
    programNumber: number,
    effectNumber: number,
  ): boolean;
  abstract samplerProgramReverbAssignment(
    programNumber: number,
    reverbNumber: number,
  ): boolean;
}
