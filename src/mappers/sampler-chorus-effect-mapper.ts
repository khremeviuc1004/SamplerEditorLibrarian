import { ChorusEffect } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from './sampler-mapper';
import { SamplerEffectMapper } from './sampler-effect-mapper';

export class ChorusEffectMapper
  extends SamplerMapperBase
  implements SamplerHeaderMapper<ChorusEffect>
{
  mapFromSysexData(data: Array<number>): ChorusEffect {
    const effect = new ChorusEffect();
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapFromSysexData(data, effect);

    effect.modulationSpeed = data[36];
    effect.modulationDepth = data[37];
    effect.feedbackLevel = data[38];

    return effect;
  }

  mapToSysexData(effect: ChorusEffect): Array<number> {
    const data = Array.from({ length: 64 }, () => 0);
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapToSysexData(data, effect);

    data[36] = effect.modulationSpeed;
    data[37] = effect.modulationDepth;
    data[38] = effect.feedbackLevel;

    return data;
  }
  mapFromUIDataByIndex(index: number, uiData: number): Array<number> {
    return [];
  }
  mapFromUIName(index: number, name: string): Array<number> {
    return [];
  }
}
