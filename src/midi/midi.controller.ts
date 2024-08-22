import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { MidiService, S1000MiscellaneousDataType } from './midi.service'
import { ChorusEffect, DelayEffect, EchoEffect, Effect, Program as InMemoryProgram, PitchShiftEffect, Reverb } from '@sampler-editor-librarian/dto'
import { KeyGroup as InMemoryKeyGroup } from '@sampler-editor-librarian/dto'
import { Sample as InMemorySample } from '@sampler-editor-librarian/dto'

  
@Controller('midi')
export class MidiController {
    constructor(
        private midiService: MidiService,
    ) {}

    @Get("ports/input")
    getMidiInputPorts(): any {
        return this.midiService.getMidiInputPorts()
    }

    @Get("ports/output")
    getMidiOutputPorts(): any {
        return this.midiService.getMidiOutputPorts()
    }

    @Get("connections")
    getMidiConnections(): any {
        console.log("Getting all midi connections...");
        return this.midiService.getMidiConnections()
    }

    @Post("ports/input/connect/:id")
    connectToInputPort(@Param('id') id: string): boolean {
        console.log("connectToInputPort", id)
        return this.midiService.connectToInputPort(parseInt(id))
    }

    @Post("ports/output/connect/:id")
    connectToOutputPort(@Param('id') id: string): boolean {
        console.log("connectToOutputPort", id)
        return this.midiService.connectToOutputPort(parseInt(id))
    }

    @Get("sampler/program/:program_number")
    samplerRequestProgramHeader(@Param('program_number') programNumber: string): InMemoryProgram {
        return this.midiService.samplerRequestProgramHeader(parseInt(programNumber))
    }

    @Get("sampler/sample/:sample_number")
    samplerRequestSampleHeader(@Param('sample_number') sampleNumber: string): InMemorySample {
        return this.midiService.samplerRequestSampleHeader(parseInt(sampleNumber))
    }

    @Get("sampler/program/:program_number/keygroup/:keygroup_number")
    samplerRequestKeygroupHeader(
        @Param('program_number') programNumber: string, 
        @Param('keygroup_number') keygroupNumber: string): InMemoryKeyGroup {
        return this.midiService.samplerRequestKeygroupHeader(parseInt(programNumber), parseInt(keygroupNumber))
    }

    @Delete("sampler/program/:program_number")
    samplerDeleteProgram(@Param('program_number') programNumber: string): boolean {
        return this.midiService.samplerDeleteProgram(parseInt(programNumber))
    }

    @Post("sampler/program/:program_number")
    samplerNewProgram(@Param('program_number') programNumber: string): boolean {
        return this.midiService.samplerNewProgram(parseInt(programNumber))
    }

    @Post("sampler/program/:program_number/keygroup/:keygroup_number")
    samplerNewKeyGroup(
        @Param('program_number') programNumber: string, 
        @Param('keygroup_number') keygroupNumber: string): boolean {
        return this.midiService.samplerNewKeyGroup(parseInt(programNumber), parseInt(keygroupNumber))
    }

    @Post("sampler/sample/:sample_number/template/:template")
    samplerNewSampleFromTemplate(
        @Param('sample_number') sampleNumber: string, 
        @Param('template') template: string): boolean {
        return this.midiService.samplerNewSampleFromTemplate(parseInt(sampleNumber), template)
    }

    @Delete("sampler/sample/:sample_number")
    samplerDeleteSample(@Param('sample_number') sampleNumber: string): boolean {
        return this.midiService.samplerDeleteSample(parseInt(sampleNumber))
    }

    @Delete("sampler/program/:program_number/keygroup/:keygroup_number")
    samplerDeleteKeygroup(
        @Param('program_number') programNumber: string, 
        @Param('keygroup_number') keygroupNumber: string): boolean {
        return this.midiService.samplerDeleteKeygroup(parseInt(programNumber), parseInt(keygroupNumber))
    }

    @Get("sampler/volume-list")
    samplerRequestVolumeList(): any {
        let volumeList = []
        for(let index = 0; index < 100; index++) {
            let volumeEntry = this.midiService.samplerRequestVolumeListEntry(index);
            if (volumeEntry.active) {
                volumeList.push(volumeEntry)
            }
            else {
                break;
            }
        }

        return volumeList
    }

    @Get("sampler/volume-list-entry/:entry_number")
    samplerRequestVolumeListEntry(@Param('entry_number') entryNumber: string): any {
        return this.midiService.samplerRequestVolumeListEntry(parseInt(entryNumber))
    }

    @Get("sampler/hard-disk-dir")
    samplerRequestHardDiskDirectory(): any {
        let entryList = []
        let sampleCount = 0;
        
        // get samples
        let entryNumber = 0
        while (true) {
            let entry = this.midiService.samplerRequestHardDiskDirectoryEntry(entryNumber++, 2)
            let entryName: string = entry.entry_name
            console.log(entry)
            if (entry.entry_name === "000000000000"
                || entryName.match(/^QL\d+\s*$/)
                || entryName.match(/^TL\d+\s*$/)
                || entryName === "EFFECTS\sFILE"
                || entryName === "DRUM\sINPUTS\s"
                || entryNumber > 255
            ) {
                break;
            }
            sampleCount++;
            entry.type = "sample"
            entryList.push(entry)
        }

        // get cue lists
        entryNumber = 0
        while (true) {
            let entry = this.midiService.samplerRequestHardDiskDirectoryEntry(entryNumber++, 3)
            let entryName: string = entry.entry_name
            console.log(entry)
            if (entry.entry_name === "000000000000" 
                || !entryName.match(/^QL\d+\s*$/)
                || entryNumber > 255
            ) {
                break;
            }
            entry.type = "cue list"
            entryList.push(entry)
        }

        // get take lists
        entryNumber = 0
        while (true) {
            let entry = this.midiService.samplerRequestHardDiskDirectoryEntry(entryNumber++, 4)
            let entryName: string = entry.entry_name
            console.log(entry)
            if (entry.entry_name === "000000000000" 
                || !entryName.match(/^TL\d+\s*$/)
                || entryNumber > 255
            ) {
                break;
            }
            entry.type = "take list"
            entryList.push(entry)
        }

        // get effects file
        entryNumber = 0
        while (true) {
            let entry = this.midiService.samplerRequestHardDiskDirectoryEntry(entryNumber++, 5)
            let entryName: string = entry.entry_name
            console.log(entry)
            if (entry.entry_name === "000000000000" 
                || entryName !== "EFFECTS FILE"
                || entryNumber > 255
            ) {
                break;
            }
            entry.type = "effects file"
            entryList.push(entry)
        }

        // get drum inputs
        entryNumber = 0
        while (true) {
            let entry = this.midiService.samplerRequestHardDiskDirectoryEntry(entryNumber++, 6)
            let entryName: string = entry.entry_name
            console.log(entry)
            if (entry.entry_name === "000000000000" 
                || entryName !== "DRUM INPUTS "
                || entryNumber > 255
            ) {
                break;
            }
            entry.type = "drum inputs"
            entryList.push(entry)
        }

        // get programs
        entryNumber = 0
        let programCount = 0
        let programList = []
        while (true) {
            let entry = this.midiService.samplerRequestHardDiskDirectoryEntry(entryNumber++, 1)
            let entryName: string = entry.entry_name
            console.log(entry)
            if (entry.entry_name === "000000000000"
                || entryName.match(/^QL\d+\s*$/)
                || entryName.match(/^TL\d+\s*$/)
                || entryName === "EFFECTS\sFILE"
                || entryName === "DRUM\sINPUTS\s"
                || entryNumber > 255
            ) {
                break;
            }
            programCount++;
            entry.type = "program"
            programList.push(entry)
        }

        if (programCount > 0) {
            programList = programList.slice(0, -sampleCount)
            entryList = programList.concat(entryList)
        }

        return entryList
    }

    @Get("sampler/hard-disk-dir-entry/type/:type/entry/:entry_number")
    samplerRequestHardDiskDirectoryEntry(
        @Param('type') selector: string,
        @Param('entry_number') entryNumber: string,
    ): any {
        return this.midiService.samplerRequestHardDiskDirectoryEntry(parseInt(entryNumber), parseInt(selector))
    }

    @Get("sampler/request-resident-program-names")
    samplerRequestResidentProgramNames(): string[] {
        return this.midiService.samplerRequestResidentProgramNames()
    }

    @Get("sampler/request-resident-sample-names")
    samplerRequestResidentSampleNames(): string[] {
        return this.midiService.samplerRequestResidentSampleNames()
    }

    @Get("sampler/sampler-status-report")
    samplerStatusReport(): any {
        return this.midiService.samplerStatusReport()
    }

    @Get("sampler/s1000-misc-data")
    samplerS1000MiscellaneousData(): any {
        return this.midiService.samplerS1000MiscellaneousData()
    }

    @Put("sampler/s1000-misc-data")
    samplerChangeS1000MiscellaneousData(
        @Body() s1000_misc_data: S1000MiscellaneousDataType
    ) {
        if (!this.midiService.samplerChangeS1000MiscellaneousData(s1000_misc_data)) {
            throw new HttpException('Sampler did not like s1000 misc data change.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Get("sampler/miscellaneous-bytes/:data_index/data_bank_knumber/:data_bank_knumber")
    samplerMiscellaneousBytes(
        @Param('data_index') data_index: string, 
        @Param('data_bank_knumber') data_bank_knumber: string
    ): boolean {
        return this.midiService.samplerMiscellaneousBytes(parseInt(data_index), parseInt(data_bank_knumber))
    }

    @Put("sampler/sampler-change-program-midi-channel/:program_number/midi_channel/:midi_channel")
    samplerChangeProgramMidiChannel(
        @Param('program_number') programNumber: string, 
        @Param('midi_channel') midi_channel: string
    ) {
        if (!this.midiService.samplerChangeProgramMidiChannel(parseInt(programNumber), parseInt(midi_channel))) {
            throw new HttpException('Sampler did not like midi channel change for program.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/program/:program_number/index/:index/value/:value")
    samplerChangeProgramHeader(
        @Param('program_number') programNumber: string, 
        @Param('index') index: string,
        @Param('value') value: string
    ) {
        console.log("MidiController.samplerChangeProgramHeader: program number, indexm value", programNumber, index, value)
        if (!this.midiService.samplerChangeProgramHeader(parseInt(programNumber), parseInt(index), parseFloat(value))) {
            throw new HttpException('Sampler did not like change for program.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/keygroup/program/:program_number/keygroup/:keygroup_number/index/:index/value/:value")
    samplerChangeKeyGroupHeader(
        @Param('program_number') programNumber: string, 
        @Param('keygroup_number') keygroupNumber: string, 
        @Param('index') index: string,
        @Param('value') value: string
    ) {
        if (!this.midiService.samplerChangeKeyGroupHeader(parseInt(programNumber), parseInt(keygroupNumber), parseInt(index), parseFloat(value))) {
            throw new HttpException('Sampler did not like change for keygroup.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/sample/:sample_number/index/:index/value/:value")
    samplerChangeSampleHeader(
        @Param('sample_number') sampleNumber: string, 
        @Param('index') index: string,
        @Param('value') value: string
    ) {
        if (!this.midiService.samplerChangeSampleHeader(parseInt(sampleNumber), parseInt(index), parseFloat(value))) {
            throw new HttpException('Sampler did not like change for sample.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/program/:program_number/index/:index/name/:name")
    samplerChangeNameInProgramHeader(
        @Param('program_number') programNumber: string, 
        @Param('index') index: string,
        @Param('name') name: string
    ) {
        if (!this.midiService.samplerChangeNameInProgramHeader(parseInt(programNumber), parseInt(index), name)) {
            throw new HttpException('Sampler did not like program name change.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/keygroup/program/:program_number/keygroup/:keygroup_number/index/:index/name/:name")
    samplerChangeZoneSampleNameInKeyGroupHeader(
        @Param('program_number') programNumber: string, 
        @Param('keygroup_number') keygroupNumber: string, 
        @Param('index') index: string,
        @Param('name') name: string
    ) {
        if (!this.midiService.samplerChangeNameInKeyGroupHeader(parseInt(programNumber), parseInt(keygroupNumber), parseInt(index), name)) {
            throw new HttpException('Sampler did not like zone sample name change.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/sample/:sample_number/index/:index/name/:name")
    samplerChangeNameInSampleHeader(
        @Param('sample_number') sampleNumber: string, 
        @Param('index') index: string,
        @Param('name') name: string
    ) {
        if (!this.midiService.samplerChangeNameInSampleHeader(parseInt(sampleNumber), parseInt(index), name)) {
            throw new HttpException('Sampler did not like sample name change.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Patch("sampler/floppy")
    samplerSelectFloppy() : boolean {
        if (!this.midiService.samplerSelectFloppy()) {
            throw new HttpException('Sampler failed to select the floppy drive.', HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Patch("sampler/harddrive")
    samplerSelectHardDrive() : boolean {
        if (!this.midiService.samplerSelectHardDrive()) {
            throw new HttpException('Sampler failed to select the hard drive.', HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Get("sampler/harddrive/partitions")
    samplerHardDriveNumberOfPartitions() : number {
        return this.midiService.samplerHardDriveNumberOfPartitions()
    }

    @Get("sampler/harddrive/partition")
    samplerHardDriveSelectedPartition() : number {
        return this.midiService.samplerHardDriveSelectedPartition()
    }

    @Patch("sampler/harddrive/partition/:partition")
    samplerSelectHardDrivePartition(
        @Param('partition') partitionNumber: string, 
    ) : boolean {
        console.log("Weird")
        if (!this.midiService.samplerSelectHardDrivePartition(+partitionNumber)) {
            throw new HttpException('Sampler failed to select the hard drive partition: ' + partitionNumber, HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Get("sampler/harddrive/partition/volumes")
    samplerHardDrivePartitionNumberOfVolumes() : number {
        return this.midiService.samplerHardDrivePartitionNumberOfVolumes()
    }

    @Get("sampler/harddrive/partition/volume")
    samplerHardDrivePartitionSelectedVolume() : number {
        return this.midiService.samplerHardDrivePartitionSelectedVolume()
    }

    @Patch("sampler/harddrive/partition/volume/:volume")
    samplerSelectHardDriveVolume(
        @Param('volume') volumeNumber: string, 
    ) : boolean {
        if (!this.midiService.samplerSelectHardDriveVolume(+volumeNumber)) {
            throw new HttpException('Sampler failed to select the hard drive volume: ' + volumeNumber, HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Patch("sampler/clear_memory_and_load_from_selected_volume/:loadtype")
    samplerClearMemoryAndLoadFromSelectedVolume(
        @Param('loadtype') loadType: string
    ): boolean {
        if (!this.midiService.samplerClearMemoryAndLoadFromSelectedVolume(+loadType)) {
            throw new HttpException('Sampler failed to clear memory and load from the selected volume into memory.', HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Patch("sampler/load_from_selected_volume/:loadtype")
    samplerLoadFromSelectedVolume(
        @Param('loadtype') loadType: string
    ): boolean {
        if (!this.midiService.samplerLoadFromSelectedVolume(+loadType)) {
            throw new HttpException('Sampler failed to load from the selected volume into memory.', HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Patch("sampler/clear_volume_and_save_memory_to_selected_volume/:savetype")
    samplerClearVolumeAndSaveMemoryToSelectedVolume(
        @Param('savetype') saveType: string
    ): boolean {
        if (!this.midiService.samplerClearVolumeAndSaveMemoryToSelectedVolume(+saveType)) {
            throw new HttpException('Sampler failed to clear volume and save memory to the selected volume.', HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }


    @Patch("sampler/save_memory_to_selected_volume/:savetype")
    samplerSaveMemoryToSelectedVolume(
        @Param('savetype') saveType: string
    ): boolean {
        if (!this.midiService.samplerSaveMemoryToSelectedVolume(+saveType)) {
            throw new HttpException('Sampler failed to save memory to the selected volume.', HttpStatus.NOT_ACCEPTABLE)
        }
        else return true
    }

    @Get("sampler/effects")
    samplerEffectsList(): Array<String> {
        return this.midiService.samplerEffectsList()
    }

    @Get("sampler/reverbs")
    samplerReverbsList(): Array<String> {
        return this.midiService.samplerReverbsList()
    }

    @Get("sampler/effect/:effect_number")
    samplerEffect(
        @Param("effect_number")effectNumber: string
    ): PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect {
        return this.midiService.samplerEffect(+effectNumber)
    }

    @Get("sampler/reverb/:reverb_number")
    samplerReverb(
        @Param("reverb_number")reverbNumber: string
    ): Reverb {
        return this.midiService.samplerReverb(+reverbNumber)
    }

    @Put("sampler/effect/:effect_number")
    samplerEffectUpdate(
        @Param("effect_number")effectNumber: string,
        @Body() effect: PitchShiftEffect | EchoEffect | DelayEffect | ChorusEffect 
    ): boolean {
        return this.midiService.samplerEffectUpdate(+effectNumber, effect)
    }

    @Patch("sampler/effect/:effect_number/effect_type/:effect_type/index/:index/value/:value")
    samplerEffectUpdatePart(
        @Param('effect_type') effectType: string, 
        @Param('effect_number') effectNumber: string, 
        @Param('index') index: string,
        @Param('value') value: string
    ) {
        console.log("MidiController.samplerEffectUpdatePart: effect number, index, value", effectNumber, index, value)
        if (!this.midiService.samplerEffectUpdatePart(+effectType, +effectNumber, +index, +value)) {
            throw new HttpException('Sampler did not like part change for effect.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Put("sampler/reverb/:reverb_number")
    samplerReverbUpdate(
        @Param("reverb_number")reverbNumber: string,
        @Body() reverb: Reverb
    ): boolean {
        return this.midiService.samplerReverbUpdate(+reverbNumber, reverb)
    }

    @Patch("sampler/reverb/:effect_number/index/:index/value/:value")
    samplerReverbUpdatePart(
        @Param('reverb_number') reverbNumber: string, 
        @Param('index') index: string,
        @Param('value') value: string
    ) {
        console.log("MidiController.samplerReverbUpdatePart: reverb number, index, value", reverbNumber, index, value)
        if (!this.midiService.samplerReverbUpdatePart(+reverbNumber, +index, +value)) {
            throw new HttpException('Sampler did not like part change for reverb.', HttpStatus.NOT_ACCEPTABLE)
        }
    }

    @Get("sampler/program/effect/assignments")
    samplerProgramEffectAssignments(): Array<number> {
        return this.midiService.samplerProgramEffectAssignments()
    }

    @Get("sampler/program/reverb/assignments")
    samplerProgramReverbAssignments(): Array<number> {
        return this.midiService.samplerProgramReverbAssignments()
    }

    @Patch("sampler/program/:program_number/effect/:effect_number")
    samplerProgramEffectAssignment(
        @Param('program_number') programNumber: string,
        @Param('effect_number') effectNumber: string
    ): boolean {
        return this.midiService.samplerProgramEffectAssignment(+programNumber, +effectNumber)
    }

    @Patch("sampler/program/:program_number/reverb/:reverb_number")
    samplerProgramReverbAssignment(
        @Param('program_number') programNumber: string,
        @Param('reverb_number') reverbNumber: string
    ): boolean {
        return this.midiService.samplerProgramReverbAssignment(+programNumber, +reverbNumber)
    }
}
