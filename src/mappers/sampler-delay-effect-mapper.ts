import { DelayEffect } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from './sampler-mapper';
import { SamplerEffectMapper } from './sampler-effect-mapper';

export class DelayEffectMapper
  extends SamplerMapperBase
  implements SamplerHeaderMapper<DelayEffect>
{
  mapFromSysexData(data: Array<number>): DelayEffect {
    const effect = new DelayEffect();
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapFromSysexData(data, effect);

    effect.feedback = data[26];
    effect.delayTime = data[27] | (data[28] << 8);
    effect.lfoDepth = data[29] | (data[30] << 8);
    effect.lfoRate = data[31];

    return effect;
  }

  mapToSysexData(effect: DelayEffect): Array<number> {
    const data = Array.from({ length: 64 }, () => 0);
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapToSysexData(data, effect);

    data[26] = effect.feedback;
    data[27] = effect.delayTime & 255;
    data[28] = effect.delayTime >> 8;
    data[29] = effect.lfoDepth & 255;
    data[30] = effect.lfoDepth >> 8;
    data[31] = effect.lfoRate;

    return data;
  }
  mapFromUIDataByIndex(index: number, uiData: number): Array<number> {
    console.log(
      'Delay effect mapper - mapFromUIDataByIndex - received: ',
      uiData,
    );

    const effectMapper = new SamplerEffectMapper();
    const data = effectMapper.mapFromUIDataByIndex(index, uiData);

    if (data.length == 0) {
      switch (index) {
        case 27:
        case 29:
          data.push(uiData & 255);
          data.push(uiData >> 8);
          break;
        default:
          data.push(uiData);
      }
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
