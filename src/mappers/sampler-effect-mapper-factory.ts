import {
  ChorusEffect,
  DelayEffect,
  EchoEffect,
  EffectType,
  PitchShiftEffect,
} from '@sampler-editor-librarian/dto';
import { PitchShiftEffectMapper } from './sampler-pitch-shift-effect-mapper';
import { EchoEffectMapper } from './sampler-echo-effect-mapper';
import { DelayEffectMapper } from './sampler-delay-effect-mapper';
import { ChorusEffectMapper } from './sampler-chorus-effect-mapper';

export class EffectMapperFactory {
  static createMapperFromEffectType(
    effectType: EffectType,
  ):
    | PitchShiftEffectMapper
    | EchoEffectMapper
    | DelayEffectMapper
    | ChorusEffectMapper {
    switch (effectType) {
      case EffectType.CHORUS:
        return new ChorusEffectMapper();
      case EffectType.PITCH_SHIFT:
        return new PitchShiftEffectMapper();
      case EffectType.ECHO:
        return new EchoEffectMapper();
      case EffectType.DELAY:
        return new DelayEffectMapper();
    }
  }

  static createMapperFromEffect(
    effect: PitchShiftEffect | ChorusEffect | DelayEffect | EchoEffect,
  ):
    | PitchShiftEffectMapper
    | EchoEffectMapper
    | DelayEffectMapper
    | ChorusEffectMapper {
    if (effect instanceof PitchShiftEffect) {
      return new PitchShiftEffectMapper();
    } else if (effect instanceof ChorusEffect) {
      return new ChorusEffectMapper();
    } else if (effect instanceof DelayEffect) {
      return new DelayEffectMapper();
    } else {
      return new EchoEffectMapper();
    }
  }
}
