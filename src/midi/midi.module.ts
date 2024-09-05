import { Module, Provider } from '@nestjs/common';
import { MidiController } from './midi.controller';
import { MidiService } from './midi.service';
import { SamplerSimulatorMidiService } from './sampler.simulator.midi.service';
import { SamplerMidiService } from './sampler.midi.service';

const midiServiceProvider: Provider = {
  provide: MidiService,
  useClass:
    process.env.SIMULATOR === 'simulator'
      ? SamplerSimulatorMidiService
      : SamplerMidiService,
};

@Module({
  controllers: [MidiController],
  providers: [midiServiceProvider],
  exports: [MidiService],
})
export class MidiModule {}
