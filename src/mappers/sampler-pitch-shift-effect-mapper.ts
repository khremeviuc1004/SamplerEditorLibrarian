import { PitchShiftEffect } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from './sampler-mapper';
import { SamplerEffectMapper } from './sampler-effect-mapper';

export class PitchShiftEffectMapper
  extends SamplerMapperBase
  implements SamplerHeaderMapper<PitchShiftEffect>
{
  mapFromSysexData(data: Array<number>): PitchShiftEffect {
    const effect = new PitchShiftEffect();
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapFromSysexData(data, effect);

    effect.leftTuneOffset = this.convertToPlusOrMinusFiftyIncludingFraction(
      data[39],
      data[40],
    );
    effect.rightTuneOffset = this.convertToPlusOrMinusFiftyIncludingFraction(
      data[41],
      data[42],
    );
    effect.leftFeedbackLevel = data[43];
    effect.rightFeedbackLevel = data[44];
    effect.leftDelayTime = data[45] | (data[46] << 8);
    effect.rightDelayTime = data[47] | (data[48] << 8);

    return effect;
  }

  mapToSysexData(effect: PitchShiftEffect): Array<number> {
    const data = Array.from({ length: 64 }, () => 0);
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapToSysexData(data, effect);

    const leftTuneOffset = this.convertFromPlusOrMinusFiftyIncludingFraction(
      effect.leftTuneOffset,
    );
    data[39] = leftTuneOffset[0];
    data[40] = leftTuneOffset[1];
    const rightTuneOffset = this.convertFromPlusOrMinusFiftyIncludingFraction(
      effect.rightTuneOffset,
    );
    data[41] = rightTuneOffset[0];
    data[42] = rightTuneOffset[1];
    data[43] = effect.leftFeedbackLevel;
    data[44] = effect.rightFeedbackLevel;
    data[45] = effect.leftDelayTime & 255;
    data[46] = effect.leftDelayTime >> 8;
    data[47] = effect.rightDelayTime & 255;
    data[48] = effect.rightDelayTime >> 8;

    return data;
  }

  mapFromUIDataByIndex(index: number, uiData: number): Array<number> {
    return [];
  }

  mapFromUIName(index: number, name: string): Array<number> {
    return [];
  }
}
