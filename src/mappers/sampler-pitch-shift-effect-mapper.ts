import { PitchShiftEffect } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from './sampler-mapper';
import { SamplerEffectMapper } from './sampler-effect-mapper';

export class PitchShiftEffectMapper
  extends SamplerMapperBase
  implements SamplerHeaderMapper<PitchShiftEffect>
{
  mapFromSysexData(data: Array<number>): PitchShiftEffect {
    const effect = new PitchShiftEffect();
    this.mapFromSysexDataUsingExisting(data, effect);
    return effect;
  }

  mapFromSysexDataUsingExisting(data: Array<number>, effect: PitchShiftEffect) {
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapFromSysexData(data, effect);

    effect.leftTuneOffset = this.convertToPlusOrMinusFiftyIncludingFraction(
      data[40],
      data[39],
    );
    effect.rightTuneOffset = this.convertToPlusOrMinusFiftyIncludingFraction(
      data[42],
      data[41],
    );
    effect.leftFeedbackLevel = data[43];
    effect.rightFeedbackLevel = data[44];
    effect.leftDelayTime = data[45] | (data[46] << 8);
    effect.rightDelayTime = data[47] | (data[48] << 8);
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
    console.log(
      'Pitch Shift effect mapper - mapFromUIDataByIndex - received: ',
      uiData,
    );

    const effectMapper = new SamplerEffectMapper();
    const data = effectMapper.mapFromUIDataByIndex(index, uiData);

    if (data.length == 0) {
      switch (index) {
        case 39:
        case 41:
          const value =
            this.convertFromPlusOrMinusFiftyIncludingFraction(uiData);
          data.push(value[0]);
          data.push(value[1]);
          break;
        case 45:
        case 47:
          data.push(uiData & 255);
          data.push(uiData >> 8);
          break;
        default:
          data.push(uiData);
      }
    }

    if (data.length == 2) {
      console.log(
        'Pitch Shift effect mapper - mapFromUIDataByIndex - converted to: ',
        data[0],
        data[1],
      );
    } else {
      console.log(
        'Pitch Shift effect mapper - mapFromUIDataByIndex - converted to: ',
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
