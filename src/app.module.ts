import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MidiModule } from './midi/midi.module';

@Module({
  imports: [
    MidiModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../modules/sampler-editor-librarian-client/build'),
    }),
  ],
})
export class AppModule {}
