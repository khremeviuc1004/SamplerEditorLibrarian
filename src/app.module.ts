import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MidiModule } from './midi/midi.module';
import { UI_TYPE } from './ui-type';

@Module({
  imports: [
    MidiModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, UI_TYPE),
    }),
  ],
})
export class AppModule {}
