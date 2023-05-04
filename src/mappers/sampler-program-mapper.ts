import { PortamentoType } from "@sampler-editor-librarian/dto";
import { Program } from '@sampler-editor-librarian/dto';
import { SamplerMapperBase, SamplerHeaderMapper } from "./sampler-mapper";



export class SamplerInMemoryProgramMapper extends SamplerMapperBase implements SamplerHeaderMapper<Program> {

    mapFromUIName(index: number, name: string): number[] {
        switch (index) {
            case 3:
                return this.convertNameToSamplerSysexName(name)
            default:
                throw new Error("Index for name field is not correct.");
        }
    }

    mapFromUIDataByIndex(index: number, uiData: number): number[] {
        let data: number[] = []

        switch (index) {
            case 40:
                data.push(this.convertFromPlusOrMinusTwelve(uiData))
                break
            case 65:
                data = this.convertFromPlusOrMinusFiftyIncludingFraction(uiData)
                break
            case 24:
            case 26:
            case 44:
            case 45:
            case 46:
            case 47:
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 89:
            case 90:
            case 91:
            case 92:
            case 93:
            case 94:
            case 95:
            case 96:
                data.push(this.convertFromPlusOrMinusFifty(uiData))
                break
            default:
                data.push(uiData)
        }

        return data
    }

    mapToSysexData(program: Program): number[] {
        let data: number[] = []

        // add all the elements with an initial value of 0 - not all elements are used by the editor but they are used internally or reserved
        while (data.length < 192) {
            data.push(0)
        }

        this.convertNameToSamplerSysexName(program.name).forEach((value, index) => data[3 + index] = value)
        data[15] = program.midi.programNumber
        data[16] = program.midi.channel
        data[17] = program.midi.polyphony
        data[18] = program.midi.priority
        data[19] = program.midi.playRangeLow
        data[20] = program.midi.playRangeHigh
        data[22] = program.masterOutput.individualOutput
        data[23] = program.masterOutput.stereoLevel
        data[24] = this.convertFromPlusOrMinusFifty(program.masterPan.stereoPan)
        data[25] = program.masterOutput.loudness
        data[26] = this.convertFromPlusOrMinusFifty(program.masterOutput.loudnessModulationInput1Amount)

        data[29] = program.lfo2.speed
        data[30] = program.lfo2.depth
        data[31] = program.lfo2.delay

        data[33] = program.lfo1.speed
        data[34] = program.lfo1.depth
        data[35] = program.lfo1.delay
        data[36] = program.lfo1.extraDepthModulationByModwheelAmount
        data[37] = program.lfo1.extraDepthModulationByAftertouchAmount
        data[38] = program.lfo1.extraDepthModulationByVelocityAmount

        data[39] = program.pitchBend.bendWheelUp
        data[40] = this.convertFromPlusOrMinusTwelve(program.pitchBend.pressureModulation)

        data[41] = program.modes.keyGroupCrossFade ? 1 : 0
        data[42] = program.numberOfKeyGroups

        data[44] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperC)
        data[45] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperCSharp)
        data[46] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperD)
        data[47] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperDSharp)
        data[48] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperE)
        data[49] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperF)
        data[50] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperFSharp)
        data[51] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperG)
        data[52] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperGSharp)
        data[53] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperA)
        data[54] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperASharp)
        data[55] = this.convertFromPlusOrMinusFifty(program.semiToneTuning.temperB)


        data[59] = program.lfo1.desync ? 1 : 0

        data[61] = program.midi.reassignment

        data[62] = program.softPedal.loudnessReduction
        data[63] = program.softPedal.attackStretch
        data[64] = program.softPedal.filterClose

        let result = this.convertFromPlusOrMinusFiftyIncludingFraction(program.masterTuning.tune)
        data[65] = result[0]
        data[66] = result[1]

        data[70] = program.masterOutput.individualLevel
        data[72] = program.modes.monoLegato ? 1 : 0
        data[73] = program.pitchBend.bendWheelDown

        data[74] = program.pitchBend.bendMode

        data[75] = this.convertFromPlusOrMinusFifty(program.midi.transpose)

        data[76] = program.masterPan.panModulationInput1Type
        data[77] = program.masterPan.panModulationInput2Type
        data[78] = program.masterPan.panModulationInput3Type

        data[79] = program.masterOutput.loudnessModulationInput2Type
        data[80] = program.masterOutput.loudnessModulationInput3Type

        data[81] = program.lfo1.speedModulationInputType
        data[82] = program.lfo1.depthModulationInputType
        data[83] = program.lfo1.delayModulationInputType

        data[84] = program.filter1FreqModulationInput1Type
        data[85] = program.filter1FreqModulationInput2Type
        data[86] = program.filter1FreqModulationInput3Type

        data[87] = program.pitchModulationInputType

        data[88] = program.loudnessModulationInputType

        data[89] = this.convertFromPlusOrMinusFifty(program.masterPan.panModulationInput1Amount)
        data[90] = this.convertFromPlusOrMinusFifty(program.masterPan.panModulationInput2Amount)
        data[91] = this.convertFromPlusOrMinusFifty(program.masterPan.panModulationInput3Amount)

        data[92] = this.convertFromPlusOrMinusFifty(program.masterOutput.loudnessModulationInput2Amount)
        data[93] = this.convertFromPlusOrMinusFifty(program.masterOutput.loudnessModulationInput3Amount)

        data[94] = this.convertFromPlusOrMinusFifty(program.lfo1.speedModulationInputAmount)
        data[95] = this.convertFromPlusOrMinusFifty(program.lfo1.depthModulationInputAmount)
        data[96] = this.convertFromPlusOrMinusFifty(program.lfo1.delayModulationInputAmount)

        data[97] = program.lfo1.waveform
        data[98] = program.lfo2.waveform

        data[99] = program.filter2FreqModulationInput1Type
        data[100] = program.filter2FreqModulationInput2Type
        data[101] = program.filter2FreqModulationInput3Type

        data[102] = program.lfo2.retrigger

        data[110] = program.portamento.rate
        data[111] = program.portamento.type
        data[112] = program.portamento.enabled ? 1 : 0

        return data
    }


    public mapFromSysexData(data: Array<number>): Program {
        let program = new Program()

        program.name = this.convertSamplerSysexNameToName(data.slice(3, 15))
        console.log("Program name: ", program.name)
        program.midi.programNumber = data[15]
        program.midi.channel = data[16]
        console.log("Program midi polyphony: ", data[17])
        program.midi.polyphony = data[17]
        program.midi.priority = data[18]
        program.midi.playRangeLow = data[19]
        program.midi.playRangeHigh = data[20]
        program.masterOutput.individualOutput = data[22]
        program.masterOutput.stereoLevel = data[23]
        program.masterPan.stereoPan = this.convertToPlusOrMinusFifty(data[24])
        program.masterOutput.loudness = data[25]
        program.masterOutput.loudnessModulationInput1Amount = this.convertToPlusOrMinusFifty(data[26])

        program.lfo2.speed = data[29]
        program.lfo2.depth = data[30]
        program.lfo2.delay = data[31]

        program.lfo1.speed = data[33]
        program.lfo1.depth = data[34]
        program.lfo1.delay = data[35]
        program.lfo1.extraDepthModulationByModwheelAmount = data[36]
        program.lfo1.extraDepthModulationByAftertouchAmount = data[37]
        program.lfo1.extraDepthModulationByVelocityAmount = data[38]

        program.pitchBend.bendWheelUp = data[39]
        program.pitchBend.pressureModulation = this.convertToPlusOrMinusTwelve(data[40])

        program.modes.keyGroupCrossFade = data[41] == 0 ? false : true
        program.numberOfKeyGroups = data[42]

        program.semiToneTuning.temperC = this.convertToPlusOrMinusFifty(data[44])
        program.semiToneTuning.temperCSharp = this.convertToPlusOrMinusFifty(data[45])
        program.semiToneTuning.temperD = this.convertToPlusOrMinusFifty(data[46])
        program.semiToneTuning.temperDSharp = this.convertToPlusOrMinusFifty(data[47])
        program.semiToneTuning.temperE = this.convertToPlusOrMinusFifty(data[48])
        program.semiToneTuning.temperF = this.convertToPlusOrMinusFifty(data[49])
        program.semiToneTuning.temperFSharp = this.convertToPlusOrMinusFifty(data[50])
        program.semiToneTuning.temperG = this.convertToPlusOrMinusFifty(data[51])
        program.semiToneTuning.temperGSharp = this.convertToPlusOrMinusFifty(data[52])
        program.semiToneTuning.temperA = this.convertToPlusOrMinusFifty(data[53])
        program.semiToneTuning.temperASharp = this.convertToPlusOrMinusFifty(data[54])
        program.semiToneTuning.temperB = this.convertToPlusOrMinusFifty(data[55])


        program.lfo1.desync = data[59] == 0 ? false : true

        program.midi.reassignment = this.convertReassignment(data[61])

        program.softPedal.loudnessReduction = data[62]
        program.softPedal.attackStretch = data[63]
        program.softPedal.filterClose = data[64]

        program.masterTuning.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[66], data[65])

        program.masterOutput.individualLevel = data[70]
        program.modes.monoLegato = data[72] == 0 ? false : true
        program.pitchBend.bendWheelDown = data[73]

        program.pitchBend.bendMode = this.convertSampleSysexBendMode(data[74])

        program.midi.transpose = this.convertToPlusOrMinusFifty(data[75])

        program.masterPan.panModulationInput1Type = this.convertSampleSysexModulationSourceType(data[76])
        program.masterPan.panModulationInput2Type = this.convertSampleSysexModulationSourceType(data[77])
        program.masterPan.panModulationInput3Type = this.convertSampleSysexModulationSourceType(data[78])

        program.masterOutput.loudnessModulationInput2Type = this.convertSampleSysexModulationSourceType(data[79])
        program.masterOutput.loudnessModulationInput3Type = this.convertSampleSysexModulationSourceType(data[80])

        program.lfo1.speedModulationInputType = this.convertSampleSysexModulationSourceType(data[81])
        program.lfo1.depthModulationInputType = this.convertSampleSysexModulationSourceType(data[82])
        program.lfo1.delayModulationInputType = this.convertSampleSysexModulationSourceType(data[83])

        program.filter1FreqModulationInput1Type = this.convertSampleSysexModulationSourceType(data[84])
        program.filter1FreqModulationInput2Type = this.convertSampleSysexModulationSourceType(data[85])
        program.filter1FreqModulationInput3Type = this.convertSampleSysexModulationSourceType(data[86])

        program.pitchModulationInputType = this.convertSampleSysexModulationSourceType(data[87])

        program.loudnessModulationInputType = this.convertSampleSysexModulationSourceType(data[88])

        program.masterPan.panModulationInput1Amount = this.convertToPlusOrMinusFifty(data[89])
        program.masterPan.panModulationInput2Amount = this.convertToPlusOrMinusFifty(data[90])
        program.masterPan.panModulationInput3Amount = this.convertToPlusOrMinusFifty(data[91])

        program.masterOutput.loudnessModulationInput2Amount = this.convertToPlusOrMinusFifty(data[92])
        program.masterOutput.loudnessModulationInput3Amount = this.convertToPlusOrMinusFifty(data[93])

        program.lfo1.speedModulationInputAmount = this.convertToPlusOrMinusFifty(data[94])
        program.lfo1.depthModulationInputAmount = this.convertToPlusOrMinusFifty(data[95])
        program.lfo1.delayModulationInputAmount = this.convertToPlusOrMinusFifty(data[96])

        program.lfo1.waveform = this.convertSampleSysexWaveform(data[97])
        program.lfo2.waveform = this.convertSampleSysexWaveform(data[98])

        program.filter2FreqModulationInput1Type = this.convertSampleSysexModulationSourceType(data[99])
        program.filter2FreqModulationInput2Type = this.convertSampleSysexModulationSourceType(data[100])
        program.filter2FreqModulationInput3Type = this.convertSampleSysexModulationSourceType(data[101])

        program.lfo2.retrigger = data[102]

        program.portamento.rate = data[110]
        program.portamento.type = data[111] == 0 ? PortamentoType.RATE : PortamentoType.TIME
        program.portamento.enabled = data[112] == 0 ? false : true

        return program
    }
}