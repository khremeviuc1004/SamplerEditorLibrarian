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

  mapFromUIDataByIndex(data: Array<number>, index: number, uiData: number) {
    // to be implemented
  }

  mapFromUIName(data: Array<number>, index: number, name: string) {
    // to be implemented
  }
}
