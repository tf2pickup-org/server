import { Global, Module } from '@nestjs/common';
import { Events } from './events';

@Global()
@Module({
  providers: [
    Events,
  ],
  exports: [
    Events,
  ],
})
export class EventsModule { }
