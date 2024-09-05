import { Effect } from '@sampler-editor-librarian/dto';
import { SamplerMapperBase } from './sampler-mapper';

export class SamplerEffectMapper extends SamplerMapperBase {
  mapFromSysexData(data: Array<number>, effect: Effect) {
    effect.name = this.convertSamplerSysexNameToName(data.slice(0, 12));
    effect.type = data[13];
    effect.outputLevel = data[15];
    effect.outputBalance = this.convertToPlusOrMinusFifty(data[16]);
    effect.stereoWidth = data[17];
    effect.highFrequencyCut = data[24];
  }

  mapToSysexData(data: Array<number>, effect: Effect) {
    const name = this.convertNameToSamplerSysexName(effect.name);
    name.forEach((value, index) => (data[index] = value));
    data[13] = effect.type;
    data[15] = effect.outputLevel;
    data[16] = this.convertFromPlusOrMinusFifty(effect.outputBalance);
    data[17] = effect.stereoWidth;
    data[24] = effect.highFrequencyCut;
  }

  mapFromUIDataByIndex(index: number, uiData: number): Array<number> {
    const data = new Array<number>();

    switch (index) {
      case 16:
      case 18:
      case 19:
      case 20:
        data.push(this.convertFromPlusOrMinusFifty(uiData));
        break;
      case 12:
      case 13:
      case 14:
      case 15:
      case 17:
      case 25:
        data.push(uiData);
        break;
      case 21:
        // 3 bytes
        break;
    }

    console.log(
      'Effect mapper - mapFromUIDataByIndex - converted to: ',
      data[0],
    );

    return data;
  }

  mapFromUIName(index: number, name: string): number[] {
    switch (index) {
      case 0:
        return this.convertNameToSamplerSysexName(name);
      default:
        throw new Error('Index for name field is not correct.');
    }
  }
}
