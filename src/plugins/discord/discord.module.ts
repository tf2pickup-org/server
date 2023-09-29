import { Global, Logger, Module, Provider } from '@nestjs/common';
import { DiscordConfigurationService } from './services/discord-configuration.service';
import { DiscordService } from './services/discord.service';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { Environment } from '@/environment/environment';
import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordController } from './controllers/discord.controller';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { PlayersModule } from '@/players/players.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { GamesModule } from '@/games/games.module';
import { QueuePromptsService } from './services/queue-prompts.service';

const discordClientProvider: Provider = {
  provide: 'DISCORD_CLIENT',
  inject: [Environment],
  useFactory: async (environment: Environment) => {
    const logger = new Logger();
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
      ],
    });

    client.on('ready', () => {
      if (client.user) {
        logger.log(`logged in as ${client.user.tag}`);
      }
    });

    await client.login(environment.discordBotToken);
    return client;
  },
};

@Global()
@Module({
  imports: [ConfigurationModule, PlayersModule, GameServersModule, GamesModule],
  providers: [
    discordClientProvider,
    DiscordService,
    DiscordConfigurationService,
    AdminNotificationsService,
    QueuePromptsService,
  ],
  exports: [DiscordService],
  controllers: [DiscordController],
})
export class DiscordModule {}
