import { KeyGroup } from '@sampler-editor-librarian/dto';
import { SamplerMapperBase, SamplerHeaderMapper } from "./sampler-mapper";


export class SamplerInMemoryKeyGroupMapper extends SamplerMapperBase implements SamplerHeaderMapper<KeyGroup> {

    mapFromUIName(index: number, name: string): number[] {
        switch (index) {
            case 34: // zone 1 sample name
                return this.convertNameToSamplerSysexName(name)
            case 58: // zone 2 sample name
                return this.convertNameToSamplerSysexName(name)
            case 82: // zone 3 sample name
                return this.convertNameToSamplerSysexName(name)
            case 106: // zone 4 sample name
                return this.convertNameToSamplerSysexName(name)
            default:
                throw new Error("Index for name field is not correct.");
        }
    }

    mapFromUIDataByIndex(index: number, uiData: number): number[] {
        let data: number[] = []

        console.log("Keygroup mapper - mapFromUIDataByIndex - received: ", uiData)

        switch (index) {
            case 8:
            case 178:
                data.push(this.convertFromPlusOrMinusTwentyFour(uiData))
                break
            case 5:
            case 48:
            case 96:
            case 72:
            case 120:
                data = this.convertFromPlusOrMinusFiftyIncludingFraction(uiData)
                break
            case 16:
            case 17:
            case 18:
            case 19:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 50:
            case 51:
            case 52:
            case 74:
            case 75:
            case 76:
            case 98:
            case 99:
            case 100:
            case 122:
            case 123:
            case 124:
            case 130:
            case 150:
            case 151:
            case 152:
            case 153:
            case 154:
            case 155:
            case 173:
            case 174:
            case 175:
            case 176:
            case 187:
            case 188:
            case 189:
            case 190:
            case 191:
                data.push(this.convertFromPlusOrMinusFifty(uiData))
                break
            case 140:
            case 142:
            case 144:
            case 146:
                data = this.convertFromPlusOrMinusNineNineNine(uiData)
                break
            default:
                data.push(uiData)
        }

        if (data.length == 2) {
            console.log("Keygroup mapper - mapFromUIDataByIndex - converted to: ", data[0], data[1])
        }
        else {
            console.log("Keygroup mapper - mapFromUIDataByIndex - converted to: ", data[0])
        }

        return data
    }

    mapToSysexData(keyGroup: KeyGroup): number[] {
        let data: number[] = []

        // add all the elements with an initial value of 0 - not all elements are used by the editor but they are used internally or reserved
        while (data.length < 192) {
            data.push(0)
        }

        data[3] = keyGroup.span.lowNote
        data[4] = keyGroup.span.highNote

        let [fractionPart, wholePart] = this.convertFromPlusOrMinusFiftyIncludingFraction(keyGroup.span.tune)
        data[5] = fractionPart
        data[6] = wholePart

        data[7] = keyGroup.filter1.frequency
        data[8] = this.convertFromPlusOrMinusTwentyFour(keyGroup.filter1.keyFollow)

        data[12] = keyGroup.envelope1.attack
        data[13] = keyGroup.envelope1.decay
        data[14] = keyGroup.envelope1.sustain
        data[15] = keyGroup.envelope1.release
        data[16] = this.convertFromPlusOrMinusFifty(keyGroup.envelope1.velocityModulationOfAttack)
        data[17] = this.convertFromPlusOrMinusFifty(keyGroup.envelope1.velocityModulationOfRelease)
        data[18] = this.convertFromPlusOrMinusFifty(keyGroup.envelope1.velocityOffModulationOfRelease)
        data[19] = this.convertFromPlusOrMinusFifty(keyGroup.envelope1.keyModulationOfDecayAndRelease)

        data[20] = keyGroup.envelope2.rate1
        data[21] = keyGroup.envelope2.rate3
        data[22] = keyGroup.envelope2.level3
        data[23] = keyGroup.envelope2.rate4
        data[24] = this.convertFromPlusOrMinusFifty(keyGroup.envelope2.velocityModulationOfRate1)
        data[25] = this.convertFromPlusOrMinusFifty(keyGroup.envelope2.velocityModulationOfRate4)
        data[26] = this.convertFromPlusOrMinusFifty(keyGroup.envelope2.velocityOffModulationOfRate4)
        data[27] = this.convertFromPlusOrMinusFifty(keyGroup.envelope2.keyModulationOfRate2AndRate4)
        data[28] = this.convertFromPlusOrMinusFifty(keyGroup.envelope2.velocityModulationOfEnvelope)

        data[30] = keyGroup.velocityCrossFade ? 1 : 0

        this.convertNameToSamplerSysexName(keyGroup.zone1.sampleName).forEach((value, index) => data[34 + index] = value)
        data[46] = keyGroup.zone1.velocityLow
        data[47] = keyGroup.zone1.velocityHigh
        let [fractionPartZone1, wholePartZone1] = this.convertFromPlusOrMinusFiftyIncludingFraction(keyGroup.zone1.tune)
        data[48] = fractionPartZone1
        data[49] = wholePartZone1
        data[50] = this.convertFromPlusOrMinusFifty(keyGroup.zone1.loudness)
        data[51] = this.convertFromPlusOrMinusFifty(keyGroup.zone1.filterCutOff)
        data[52] = this.convertFromPlusOrMinusFifty(keyGroup.zone1.pan)
        data[53] = keyGroup.zone1.playback

        this.convertNameToSamplerSysexName(keyGroup.zone2.sampleName).forEach((value, index) => data[58 + index] = value)
        data[70] = keyGroup.zone2.velocityLow
        data[71] = keyGroup.zone2.velocityHigh
        let [fractionPartZone2, wholePartZone2] = this.convertFromPlusOrMinusFiftyIncludingFraction(keyGroup.zone2.tune)
        data[72] = fractionPartZone2
        data[73] = wholePartZone2
        data[74] = this.convertFromPlusOrMinusFifty(keyGroup.zone2.loudness)
        data[75] = this.convertFromPlusOrMinusFifty(keyGroup.zone2.filterCutOff)
        data[76] = this.convertFromPlusOrMinusFifty(keyGroup.zone2.pan)
        data[77] = keyGroup.zone2.playback

        this.convertNameToSamplerSysexName(keyGroup.zone3.sampleName).forEach((value, index) => data[82 + index] = value)
        data[94] = keyGroup.zone3.velocityLow
        data[95] = keyGroup.zone3.velocityHigh
        let [fractionPartZone3, wholePartZone3] = this.convertFromPlusOrMinusFiftyIncludingFraction(keyGroup.zone3.tune)
        data[96] = fractionPartZone3
        data[97] = wholePartZone3
        data[98] = this.convertFromPlusOrMinusFifty(keyGroup.zone3.loudness)
        data[99] = this.convertFromPlusOrMinusFifty(keyGroup.zone3.filterCutOff)
        data[100] = this.convertFromPlusOrMinusFifty(keyGroup.zone3.pan)
        data[101] = keyGroup.zone3.playback

        this.convertNameToSamplerSysexName(keyGroup.zone4.sampleName).forEach((value, index) => data[106 + index] = value)
        data[118] = keyGroup.zone4.velocityLow
        data[119] = keyGroup.zone4.velocityHigh
        let [fractionPartZone4, wholePartZone4] = this.convertFromPlusOrMinusFiftyIncludingFraction(keyGroup.zone4.tune)
        data[120] = fractionPartZone4
        data[121] = wholePartZone4
        data[122] = this.convertFromPlusOrMinusFifty(keyGroup.zone4.loudness)
        data[123] = this.convertFromPlusOrMinusFifty(keyGroup.zone4.filterCutOff)
        data[124] = this.convertFromPlusOrMinusFifty(keyGroup.zone4.pan)
        data[125] = keyGroup.zone4.playback

        data[130] = this.convertFromPlusOrMinusFifty(keyGroup.span.beat)

        data[131] = keyGroup.envelope1.attackHold ? 1 : 0

        data[132] = keyGroup.zone1.pitch
        data[133] = keyGroup.zone2.pitch
        data[134] = keyGroup.zone3.pitch
        data[135] = keyGroup.zone4.pitch

        data[136] = keyGroup.zone1.output //0 to 10 for S3000, S3200; 0 to 4 for S2800
        data[137] = keyGroup.zone2.output //0 to 10 for S3000, S3200; 0 to 4 for S2800
        data[138] = keyGroup.zone3.output //0 to 10 for S3000, S3200; 0 to 4 for S2800
        data[139] = keyGroup.zone4.output //0 to 10 for S3000, S3200; 0 to 4 for S2800

        let velToStartPosAdjZone1 = this.convertFromPlusOrMinusNineNineNine(keyGroup.zone1.velToStartPosAdj)
        data[140] = velToStartPosAdjZone1[0]
        data[141] = velToStartPosAdjZone1[1]
        let velToStartPosAdjZone2 = this.convertFromPlusOrMinusNineNineNine(keyGroup.zone2.velToStartPosAdj)
        data[142] = velToStartPosAdjZone2[0]
        data[143] = velToStartPosAdjZone2[1]
        let velToStartPosAdjZone3 = this.convertFromPlusOrMinusNineNineNine(keyGroup.zone3.velToStartPosAdj)
        data[144] = velToStartPosAdjZone3[0]
        data[145] = velToStartPosAdjZone3[1]
        let velToStartPosAdjZone4 = this.convertFromPlusOrMinusNineNineNine(keyGroup.zone4.velToStartPosAdj)
        data[146] = velToStartPosAdjZone4[0]
        data[147] = velToStartPosAdjZone4[1]

        data[149] = keyGroup.filter1.resonance

        data[150] = this.convertFromPlusOrMinusFifty(keyGroup.pitchModulationByLFO1)

        data[151] = this.convertFromPlusOrMinusFifty(keyGroup.filter1.freqModulationInput1Amount)
        data[152] = this.convertFromPlusOrMinusFifty(keyGroup.filter1.freqModulationInput2Amount)
        data[153] = this.convertFromPlusOrMinusFifty(keyGroup.filter1.freqModulationInput3Amount)

        data[154] = this.convertFromPlusOrMinusFifty(keyGroup.pitchModulationInputAmount)

        data[155] = this.convertFromPlusOrMinusFifty(keyGroup.loudnessModulationInputAmount)

        data[156] = keyGroup.envelope2.level1
        data[157] = keyGroup.envelope2.rate2
        data[158] = keyGroup.envelope2.level2
        data[159] = keyGroup.envelope2.level4

        data[160] = keyGroup.muteGroup

        // Parameter: PFXCHAN
        // Offset: 161 bytes
        // Field size: 1 byte
        // Range: 0 to 4
        // Description: Effects bus select
        // 0 = OFF
        // 1 = FX1
        // 2 = FX2
        // 3 = RV3
        // 4 = RV4
        // data[161] no idea where this is in a keygroup - can't find where this is in the sampler UI

        // Parameter: PFXSLEV
        // Offset: 162 bytes
        // Field size: 1 byte
        // Range: 0 to 99
        // Description: Effects send level
        // data[162] no idea where this is in a keygroup - can't find where this is in the sampler UI

        data[168] = keyGroup.filter2ToneEnabled ? 1 : 0

        data[169] = keyGroup.filter2.attenuator
        data[170] = keyGroup.filter2.filterType
        data[171] = keyGroup.filter2.resonance

        data[172] = keyGroup.tone.centerFreqency
        data[173] = this.convertFromPlusOrMinusFifty(keyGroup.tone.slope)

        data[174] = this.convertFromPlusOrMinusFifty(keyGroup.filter2.freqModulationInput1Amount)
        data[175] = this.convertFromPlusOrMinusFifty(keyGroup.filter2.freqModulationInput2Amount)
        data[176] = this.convertFromPlusOrMinusFifty(keyGroup.filter2.freqModulationInput3Amount)

        data[177] = keyGroup.filter2.frequency
        data[178] = this.convertFromPlusOrMinusTwentyFour(keyGroup.filter2.keyFollow)

        data[179] = keyGroup.envelope3.rate1
        data[180] = keyGroup.envelope3.level1
        data[181] = keyGroup.envelope3.rate2
        data[182] = keyGroup.envelope3.level2
        data[183] = keyGroup.envelope3.rate3
        data[184] = keyGroup.envelope3.level3
        data[185] = keyGroup.envelope3.rate4
        data[186] = keyGroup.envelope3.level4

        data[187] = this.convertFromPlusOrMinusFifty(keyGroup.envelope3.velocityModulationOfRate1)
        data[188] = this.convertFromPlusOrMinusFifty(keyGroup.envelope3.velocityModulationOfRate4)
        data[189] = this.convertFromPlusOrMinusFifty(keyGroup.envelope3.velocityOffModulationOfRate4)
        data[190] = this.convertFromPlusOrMinusFifty(keyGroup.envelope3.keyModulationOfRate2AndRate4)
        data[191] = this.convertFromPlusOrMinusFifty(keyGroup.envelope3.velocityModulationOfEnvelope)

        return data
    }


    public mapFromSysexData(data: Array<number>): KeyGroup {
        let keyGroup = new KeyGroup()

        keyGroup.span.lowNote = data[3]
        keyGroup.span.highNote = data[4]

        keyGroup.span.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[6], data[5])

        keyGroup.filter1.frequency = data[7]
        keyGroup.filter1.keyFollow = this.convertToPlusOrMinusTwentyFour(data[8])

        keyGroup.envelope1.attack = data[12]
        keyGroup.envelope1.decay = data[13]
        keyGroup.envelope1.sustain = data[14]
        keyGroup.envelope1.release = data[15]
        keyGroup.envelope1.velocityModulationOfAttack = this.convertToPlusOrMinusFifty(data[16])
        keyGroup.envelope1.velocityModulationOfRelease = this.convertToPlusOrMinusFifty(data[17])
        keyGroup.envelope1.velocityOffModulationOfRelease = this.convertToPlusOrMinusFifty(data[18])
        keyGroup.envelope1.keyModulationOfDecayAndRelease = this.convertToPlusOrMinusFifty(data[19])

        keyGroup.envelope2.rate1 = data[20]
        keyGroup.envelope2.rate3 = data[21]
        keyGroup.envelope2.level3 = data[22]
        keyGroup.envelope2.rate4 = data[23]
        keyGroup.envelope2.velocityModulationOfRate1 = this.convertToPlusOrMinusFifty(data[24])
        keyGroup.envelope2.velocityModulationOfRate4 = this.convertToPlusOrMinusFifty(data[25])
        keyGroup.envelope2.velocityOffModulationOfRate4 = this.convertToPlusOrMinusFifty(data[26])
        keyGroup.envelope2.keyModulationOfRate2AndRate4 = this.convertToPlusOrMinusFifty(data[27])
        keyGroup.envelope2.velocityModulationOfEnvelope = this.convertToPlusOrMinusFifty(data[28])

        keyGroup.velocityCrossFade = data[30] == 0 ? false : true

        keyGroup.zone1.sampleName = this.convertSamplerSysexNameToName(data.slice(34, 46))
        keyGroup.zone1.velocityLow = data[46]
        keyGroup.zone1.velocityHigh = data[47]
        keyGroup.zone1.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[49], data[48])
        keyGroup.zone1.loudness = this.convertToPlusOrMinusFifty(data[50])
        keyGroup.zone1.filterCutOff = this.convertToPlusOrMinusFifty(data[51])
        keyGroup.zone1.pan = this.convertToPlusOrMinusFifty(data[52])
        keyGroup.zone1.playback = this.convertSampleSysexZonePlayback(data[53])

        keyGroup.zone2.sampleName = this.convertSamplerSysexNameToName(data.slice(58, 70))
        keyGroup.zone2.velocityLow = data[70]
        keyGroup.zone2.velocityHigh = data[71]
        keyGroup.zone2.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[73], data[72])
        keyGroup.zone2.loudness = this.convertToPlusOrMinusFifty(data[74])
        keyGroup.zone2.filterCutOff = this.convertToPlusOrMinusFifty(data[75])
        keyGroup.zone2.pan = this.convertToPlusOrMinusFifty(data[76])
        keyGroup.zone2.playback = this.convertSampleSysexZonePlayback(data[77])

        keyGroup.zone3.sampleName = this.convertSamplerSysexNameToName(data.slice(82, 94))
        keyGroup.zone3.velocityLow = data[94]
        keyGroup.zone3.velocityHigh = data[95]
        keyGroup.zone3.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[97], data[96])
        keyGroup.zone3.loudness = this.convertToPlusOrMinusFifty(data[98])
        keyGroup.zone3.filterCutOff = this.convertToPlusOrMinusFifty(data[99])
        keyGroup.zone3.pan = this.convertToPlusOrMinusFifty(data[100])
        keyGroup.zone3.playback = this.convertSampleSysexZonePlayback(data[101])

        keyGroup.zone4.sampleName = this.convertSamplerSysexNameToName(data.slice(106, 118))
        keyGroup.zone4.velocityLow = data[118]
        keyGroup.zone4.velocityHigh = data[119]
        keyGroup.zone4.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[121], data[120])
        keyGroup.zone4.loudness = this.convertToPlusOrMinusFifty(data[122])
        keyGroup.zone4.filterCutOff = this.convertToPlusOrMinusFifty(data[123])
        keyGroup.zone4.pan = this.convertToPlusOrMinusFifty(data[124])
        keyGroup.zone4.playback = this.convertSampleSysexZonePlayback(data[125])

        keyGroup.span.beat = this.convertToPlusOrMinusFifty(data[130])

        keyGroup.envelope1.attackHold = data[131] == 0 ? false : true

        keyGroup.zone1.pitch = this.convertSampleSysexZonePitch(data[132])
        keyGroup.zone2.pitch = this.convertSampleSysexZonePitch(data[133])
        keyGroup.zone3.pitch = this.convertSampleSysexZonePitch(data[134])
        keyGroup.zone4.pitch = this.convertSampleSysexZonePitch(data[135])

        keyGroup.zone1.output = data[136] //0 to 10 for S3000, S3200; 0 to 4 for S2800
        keyGroup.zone2.output = data[137] //0 to 10 for S3000, S3200; 0 to 4 for S2800
        keyGroup.zone3.output = data[138] //0 to 10 for S3000, S3200; 0 to 4 for S2800
        keyGroup.zone4.output = data[139] //0 to 10 for S3000, S3200; 0 to 4 for S2800

        keyGroup.zone1.velToStartPosAdj = this.convertToPlusOrMinusNineNineNine(data[140] | (data[141] << 8))
        keyGroup.zone2.velToStartPosAdj = this.convertToPlusOrMinusNineNineNine(data[142] | (data[143] << 8))
        keyGroup.zone3.velToStartPosAdj = this.convertToPlusOrMinusNineNineNine(data[144] | (data[145] << 8))
        keyGroup.zone4.velToStartPosAdj = this.convertToPlusOrMinusNineNineNine(data[146] | (data[147] << 8))

        keyGroup.filter1.resonance = data[149]

        keyGroup.pitchModulationByLFO1 = this.convertToPlusOrMinusFifty(data[150])

        keyGroup.filter1.freqModulationInput1Amount = this.convertToPlusOrMinusFifty(data[151])
        keyGroup.filter1.freqModulationInput2Amount = this.convertToPlusOrMinusFifty(data[152])
        keyGroup.filter1.freqModulationInput3Amount = this.convertToPlusOrMinusFifty(data[153])

        keyGroup.pitchModulationInputAmount = this.convertToPlusOrMinusFifty(data[154])

        keyGroup.loudnessModulationInputAmount = this.convertToPlusOrMinusFifty(data[155])

        keyGroup.envelope2.level1 = data[156]
        keyGroup.envelope2.rate2 = data[157]
        keyGroup.envelope2.level2 = data[158]
        keyGroup.envelope2.level4 = data[159]

        keyGroup.muteGroup = data[160]

        // Parameter: PFXCHAN
        // Offset: 161 bytes
        // Field size: 1 byte
        // Range: 0 to 4
        // Description: Effects bus select
        // 0 = OFF
        // 1 = FX1
        // 2 = FX2
        // 3 = RV3
        // 4 = RV4
        // data[161] no idea where this is in a keygroup - can't find where this is in the sampler UI

        // Parameter: PFXSLEV
        // Offset: 162 bytes
        // Field size: 1 byte
        // Range: 0 to 99
        // Description: Effects send level
        // data[162] no idea where this is in a keygroup - can't find where this is in the sampler UI

        keyGroup.filter2ToneEnabled = data[168] == 0 ? false : true

        keyGroup.filter2.attenuator = data[169]
        keyGroup.filter2.filterType = this.convertSampleSysexFilterType(data[170])
        keyGroup.filter2.resonance = data[171]

        keyGroup.tone.centerFreqency = data[172]
        keyGroup.tone.slope = this.convertToPlusOrMinusFifty(data[173])

        keyGroup.filter2.freqModulationInput1Amount = this.convertToPlusOrMinusFifty(data[174])
        keyGroup.filter2.freqModulationInput2Amount = this.convertToPlusOrMinusFifty(data[175])
        keyGroup.filter2.freqModulationInput3Amount = this.convertToPlusOrMinusFifty(data[176])

        keyGroup.filter2.frequency = data[177]
        keyGroup.filter2.keyFollow = this.convertToPlusOrMinusTwentyFour(data[178])

        keyGroup.envelope3.rate1 = data[179]
        keyGroup.envelope3.level1 = data[180]
        keyGroup.envelope3.rate2 = data[181]
        keyGroup.envelope3.level2 = data[182]
        keyGroup.envelope3.rate3 = data[183]
        keyGroup.envelope3.level3 = data[184]
        keyGroup.envelope3.rate4 = data[185]
        keyGroup.envelope3.level4 = data[186]

        keyGroup.envelope3.velocityModulationOfRate1 = this.convertToPlusOrMinusFifty(data[187])
        keyGroup.envelope3.velocityModulationOfRate4 = this.convertToPlusOrMinusFifty(data[188])
        keyGroup.envelope3.velocityOffModulationOfRate4 = this.convertToPlusOrMinusFifty(data[189])
        keyGroup.envelope3.keyModulationOfRate2AndRate4 = this.convertToPlusOrMinusFifty(data[190])
        keyGroup.envelope3.velocityModulationOfEnvelope = this.convertToPlusOrMinusFifty(data[191])

        return keyGroup
    }
}