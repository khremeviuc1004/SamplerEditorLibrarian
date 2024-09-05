import { EchoEffect } from '@sampler-editor-librarian/dto';
import { SamplerHeaderMapper, SamplerMapperBase } from './sampler-mapper';
import { SamplerEffectMapper } from './sampler-effect-mapper';

export class EchoEffectMapper
  extends SamplerMapperBase
  implements SamplerHeaderMapper<EchoEffect>
{
  mapFromSysexData(data: Array<number>): EchoEffect {
    const effect = new EchoEffect();
    this.mapFromSysexDataUsingExisting(data, effect);
    return effect;
  }

  mapFromSysexDataUsingExisting(data: Array<number>, effect: EchoEffect) {
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapFromSysexData(data, effect);

    effect.delay1 = data[49] | (data[50] << 8);
    effect.delay2 = data[51] | (data[52] << 8);
    effect.delay3 = data[53] | (data[54] << 8);
    effect.feedback1Level = data[55];
    effect.feedback2Level = data[56];
    effect.feedback3Level = data[57];
    effect.pan1 = this.convertToPlusOrMinusFifty(data[58]);
    effect.pan2 = this.convertToPlusOrMinusFifty(data[59]);
    effect.pan3 = this.convertToPlusOrMinusFifty(data[60]);
    effect.leftExtraDelay = data[61] | (data[62] << 8);
    effect.feedbackDamping = data[63];
  }

  mapToSysexData(effect: EchoEffect): Array<number> {
    const data = Array.from({ length: 64 }, () => 0);
    const effectMapper = new SamplerEffectMapper();

    effectMapper.mapToSysexData(data, effect);

    data[49] = effect.delay1 & 255;
    data[50] = effect.delay1 >> 8;
    data[51] = effect.delay2 & 255;
    data[52] = effect.delay2 >> 8;
    data[53] = effect.delay3 & 255;
    data[54] = effect.delay3 >> 8;
    data[55] = effect.feedback1Level;
    data[56] = effect.feedback2Level;
    data[57] = effect.feedback3Level;
    data[58] = this.convertFromPlusOrMinusFifty(effect.pan1);
    data[59] = this.convertFromPlusOrMinusFifty(effect.pan2);
    data[60] = this.convertFromPlusOrMinusFifty(effect.pan3);
    data[61] = effect.leftExtraDelay & 255;
    data[62] = effect.leftExtraDelay >> 8;
    data[63] = effect.feedbackDamping;

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
        case 58:
        case 59:
        case 60:
          data.push(this.convertFromPlusOrMinusFifty(uiData));
          break;
        case 49:
        case 51:
        case 53:
        case 61:
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
