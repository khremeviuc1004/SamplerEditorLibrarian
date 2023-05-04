import { Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { MidiService } from './midi.service'
import { Program as InMemoryProgram } from '@sampler-editor-librarian/dto'
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
            volumeList.push(this.midiService.samplerRequestVolumeListEntry(index))
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
}
