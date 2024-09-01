import { Reverb, ReverbType } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from './sampler-mapper';

export class SamplerReverbMapper
  extends SamplerMapperBase
  implements SamplerHeaderMapper<Reverb>
{
  mapFromSysexData(data: Array<number>): Reverb {
    const reverb = new Reverb();

    reverb.name = this.convertSamplerSysexNameToName(data.slice(0, 12));
    reverb.type = data[13];
    reverb.outputLevel = data[15];
    reverb.outputBalance = this.convertToPlusOrMinusFifty(data[16]);
    reverb.stereoWidth = data[17];
    reverb.preDelay = data[21] | (data[22] << 8); // this is 2 bytes - need to check what is actually being done here due to the weirdness of the various encodings used
    reverb.highFrequencyCut = data[24];
    reverb.highFrequencyDamping = data[32];
    reverb.decayTime = data[33];
    reverb.diffusion = data[35];

    return reverb;
  }

  mapToSysexData(reverb: Reverb): Array<number> {
    // create a 64 element array
    const data = Array.from({ length: 64 }, () => 0);

    const name = this.convertNameToSamplerSysexName(reverb.name);
    name.forEach((value, index) => (data[index] = value));
    data[13] = reverb.type;
    data[15] = reverb.outputLevel;
    data[16] = this.convertFromPlusOrMinusFifty(reverb.outputBalance);
    data[17] = reverb.stereoWidth;
    data[21] = reverb.preDelay & 127; // this is 2 bytes - need to check what is actually being done here due to the weirdness of the various encodings used
    data[22] = reverb.preDelay >> 7;
    data[24] = reverb.highFrequencyCut;
    data[32] = reverb.highFrequencyDamping;
    data[33] = reverb.decayTime;
    data[35] = reverb.diffusion;

    return data;
  }

  mapFromUIDataByIndex(index: number, uiData: number): Array<number> {
    const data = new Array<number>();

    console.log('Reverb mapper - mapFromUIDataByIndex - received: ', uiData);

    switch (index) {
      case 16:
        data.push(this.convertFromPlusOrMinusFifty(uiData));
        break;
      case 21:
        data.push(uiData & 255);
        data.push(uiData >> 8);
        break;
      default:
        data.push(uiData);
    }

    if (data.length == 2) {
      console.log(
        'Delay effect mapper - mapFromUIDataByIndex - converted to: ',
        data[0],
        data[1],
      );
    } else {
      console.log(
        'Delay effect mapper - mapFromUIDataByIndex - converted to: ',
        data[0],
      );
    }

    return data;
  }

  mapFromUIName(index: number, name: string): Array<number> {
    switch (index) {
      case 0:
        return this.convertNameToSamplerSysexName(name);
      default:
        throw new Error('Index for name field is not correct.');
    }
  }
}
