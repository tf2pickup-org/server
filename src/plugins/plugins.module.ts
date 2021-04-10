import { DynamicModule, Module } from '@nestjs/common';
import { DiscordModule } from './discord/discord.module';
import { TwitchModule } from './twitch/twitch.module';

const discordModule = () =>
  process.env.DISCORD_BOT_TOKEN ? [DiscordModule] : [];
const twitchModule = () =>
  process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
    ? [TwitchModule]
    : [];

@Module({})
export class PluginsModule {
  static configure(): DynamicModule {
    return {
      module: PluginsModule,
      imports: [...discordModule(), ...twitchModule()],
    };
  }
}
