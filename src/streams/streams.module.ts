import { DynamicModule, Module } from '@nestjs/common';
import { TwitchModule } from './twitch/twitch.module';

const twitchModule = () => (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) ? [ TwitchModule ] : [];

@Module({ })
export class StreamsModule {

  static configure(): DynamicModule {
    return {
      module: StreamsModule,
      imports: [
        ...twitchModule(),
      ],
    };
  }

}
