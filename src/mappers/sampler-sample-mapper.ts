import { Sample } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from "./sampler-mapper";


export class SamplerInMemorySampleMapper extends SamplerMapperBase implements SamplerHeaderMapper<Sample> {
    
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
            case 20:
                data = this.convertFromPlusOrMinusFiftyIncludingFraction(uiData)
                break
            case 22:
            case 26:
            case 30:
            case 34:
            case 38:
            case 50:
            case 62:
            case 74:
            case 86:
            case 98:
            case 110:
            case 122:
                data = this.convertToFourBytes(uiData)
                break
            case 42:
            case 54:
            case 66:
            case 78:
                let results = this.convertFromLoopLengthIncludingFraction(uiData)
                data.push(results[0][0])
                data.push(results[0][1])
                data.push(results[1][0])
                data.push(results[1][1])
                data.push(results[1][2])
                data.push(results[1][3])
                break
            case 48:
            case 60:
            case 72:
            case 84:
            case 138:
                data = this.convertToTwoBytes(uiData)
                break
            case 140:
                data.push(this.convertFromPlusOrMinusFifty(uiData))
                break
            default:
                data.push(uiData)
        }

        return data
    }

    mapToSysexData(sample: Sample): number[] {
        let data: number[] = []

        // add all the elements with an initial value of 0 - not all elements are used by the editor but they are used internally or reserved
        while(data.length < 192) {
            data.push(0)
        }

        data[1] = sample.bandwith
        data[2] = sample.originalPitch
        this.convertNameToSamplerSysexName(sample.name).forEach((value, index) => data[3 + index] = value)
        data[15] = sample.valid ? 128 : 0
        data[16] = sample.numberOfLoops
        data[19] = sample.playbackType
        let result = this.convertFromPlusOrMinusFiftyIncludingFraction(sample.tune)
        data[20] = result[0]
        data[21] = result[1]

        result = this.convertToFourBytes(sample.sampleLength)
        data[26] = result[0]
        data[27] = result[1]
        data[28] = result[2]
        data[29] = result[3]
        result = this.convertToFourBytes(sample.startOffset)
        data[30] = result[0]
        data[31] = result[1]
        data[32] = result[2]
        data[33] = result[3]
        result = this.convertToFourBytes(sample.playLength)
        data[34] = result[0]
        data[35]= result[1]
        data[36] = result[2]
        data[37] = result[3]

        result = this.convertToFourBytes(sample.loop1.loopStart)
        data[38] = result[0]
        data[39]= result[1]
        data[40] = result[2]
        data[41] = result[3]
        let results = this.convertFromLoopLengthIncludingFraction(sample.loop1.loopLength)
        data[42] = results[0][0]
        data[43] = results[0][1]
        data[44] = results[1][0]
        data[45]= results[1][1]
        data[46] = results[1][2]
        data[47] = results[1][3]
        result = this.convertToTwoBytes(sample.loop1.dwellTime)
        data[48] = result[0]
        data[49] = result[1]

        result = this.convertToFourBytes(sample.loop2.loopStart)
        data[50] = result[0]
        data[51]= result[1]
        data[52] = result[2]
        data[53] = result[3]
        results = this.convertFromLoopLengthIncludingFraction(sample.loop2.loopLength)
        data[54] = results[0][0]
        data[55] = results[0][1]
        data[56] = results[1][0]
        data[57]= results[1][1]
        data[58] = results[1][2]
        data[59] = results[1][3]
        result = this.convertToTwoBytes(sample.loop2.dwellTime)
        data[60] = result[0]
        data[61] = result[1]

        result = this.convertToFourBytes(sample.loop3.loopStart)
        data[62] = result[0]
        data[63]= result[1]
        data[64] = result[2]
        data[65] = result[3]
        results = this.convertFromLoopLengthIncludingFraction(sample.loop3.loopLength)
        data[66] = results[0][0]
        data[67] = results[0][1]
        data[68] = results[1][0]
        data[69]= results[1][1]
        data[70] = results[1][2]
        data[71] = results[1][3]
        result = this.convertToTwoBytes(sample.loop3.dwellTime)
        data[72] = result[0]
        data[73] = result[1]

        result = this.convertToFourBytes(sample.loop4.loopStart)
        data[74] = result[0]
        data[75]= result[1]
        data[76] = result[2]
        data[77] = result[3]
        results = this.convertFromLoopLengthIncludingFraction(sample.loop4.loopLength)
        data[78] = results[0][0]
        data[79] = results[0][1]
        data[80] = results[1][0]
        data[81]= results[1][1]
        data[82] = results[1][2]
        data[83] = results[1][3]
        result = this.convertToTwoBytes(sample.loop4.dwellTime)
        data[84] = result[0]
        data[85] = result[1]

        result = this.convertToFourBytes(sample.loop1.relativeLoopFactors)
        data[86] = result[0]
        data[87]= result[1]
        data[88] = result[2]
        data[89] = result[3]
        result = this.convertToFourBytes(sample.loop2.relativeLoopFactors)
        data[98] = result[0]
        data[99]= result[1]
        data[100] = result[2]
        data[101] = result[3]
        result = this.convertToFourBytes(sample.loop3.relativeLoopFactors)
        data[110] = result[0]
        data[111]= result[1]
        data[112] = result[2]
        data[113] = result[3]
        result = this.convertToFourBytes(sample.loop4.relativeLoopFactors)
        data[122] = result[0]
        data[123]= result[1]
        data[124] = result[2]
        data[125] = result[3]

        result = this.convertToTwoBytes(sample.sampleRate)
        data[138] = result[0]
        data[139] = result[1]

        data[140] = this.convertFromPlusOrMinusFifty(sample.tuningOffset)

        return data
    }


    public mapFromSysexData(data: Array<number>): Sample {
        let sample = new Sample()

        sample.bandwith = data[1]
        sample.originalPitch = data[2]
        sample.name = this.convertSamplerSysexNameToName(data.slice(3, 15))
        sample.valid = data[15] == 0 ? false : true
        sample.numberOfLoops = data[16]
        sample.playbackType = this.convertSampleSysexSamplePlayback(data[19])
        sample.tune = this.convertToPlusOrMinusFiftyIncludingFraction(data[21], data[20])

        sample.sampleLength = data[26] | (data[27] << 8) | (data[28] << 16) | (data[29] << 24)
        sample.startOffset = data[30] | (data[31] << 8) | (data[32] << 16) | (data[33] << 24)
        sample.playLength = data[34] | (data[35] << 8) | (data[36] << 16) | (data[37] << 24)

        sample.loop1.loopStart = data[38] | (data[39] << 8) | (data[40] << 16) | (data[41] << 24)
        sample.loop1.loopLength = this.convertToLoopLengthIncludingFraction([data[42], data[43]], [data[44], data[45], data[46], data[47]])
        sample.loop1.dwellTime = data[48] | (data[49] << 8)

        sample.loop2.loopStart = data[50] | (data[51] << 8) | (data[52] << 16) | (data[53] << 24)
        sample.loop2.loopLength = this.convertToLoopLengthIncludingFraction([data[54], data[55]], [data[56], data[57], data[58], data[59]])
        sample.loop2.dwellTime = data[60] | (data[61] << 8)

        sample.loop3.loopStart = data[62] | (data[63] << 8) | (data[64] << 16) | (data[65] << 24)
        sample.loop3.loopLength = this.convertToLoopLengthIncludingFraction([data[66], data[67]], [data[68], data[69], data[70], data[71]])
        sample.loop3.dwellTime = data[72] | (data[73] << 8)

        sample.loop4.loopStart = data[74] | (data[75] << 8) | (data[76] << 16) | (data[77] << 24)
        sample.loop4.loopLength = this.convertToLoopLengthIncludingFraction([data[78], data[79]], [data[80], data[81], data[82], data[83]])
        sample.loop4.dwellTime = data[84] | (data[85] << 8)

        sample.loop1.relativeLoopFactors = data[86] | (data[87] << 8) | (data[88] << 16) | (data[89] << 24)
        sample.loop2.relativeLoopFactors = data[98] | (data[99] << 8) | (data[100] << 16) | (data[101] << 24)
        sample.loop3.relativeLoopFactors = data[110] | (data[111] << 8) | (data[112] << 16) | (data[113] << 24)
        sample.loop4.relativeLoopFactors = data[122] | (data[123] << 8) | (data[124] << 16) | (data[125] << 24)

        sample.sampleRate = data[138] | (data[139] << 8)

        sample.tuningOffset = this.convertToPlusOrMinusFifty(data[140])

        return sample
    }
}