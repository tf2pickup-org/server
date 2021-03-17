import { DynamicModule, Module } from '@nestjs/common';
import { DiscordModule } from './discord/discord.module';

const discordModule = () => process.env.DISCORD_BOT_TOKEN ? [ DiscordModule ] : [];

@Module({ })
export class PluginsModule {

  static configure(): DynamicModule {
    return {
      module: PluginsModule,
      imports: [
        ...discordModule(),
      ],
    };
  }

}
