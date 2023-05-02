import { Module } from '@nestjs/common';
import { MidiController } from './midi.controller';
import { MidiService } from './midi.service';

@Module({
    controllers: [MidiController],
    providers: [MidiService],
    exports: [MidiService],
})
export class MidiModule {}
