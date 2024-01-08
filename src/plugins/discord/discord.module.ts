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
import { PlayerSubsNotificationsService } from './services/player-subs-notifications.service';
import { EmojiInstallerService } from './services/emoji-installer.service';
import { QueueConfigModule } from '@/queue-config/queue-config.module';
import { QueueModule } from '@/queue/queue.module';
import { DISCORD_CLIENT } from './discord-client.token';

const discordClientProvider: Provider = {
  provide: DISCORD_CLIENT,
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

    const ready = new Promise<void>((resolve) => {
      client.on('ready', () => {
        if (client.user) {
          logger.log(`logged in as ${client.user.tag}`);
        }
        resolve();
      });
    });

    await client.login(environment.discordBotToken);
    await ready;
    return client;
  },
};

@Global()
@Module({
  imports: [
    ConfigurationModule,
    PlayersModule,
    GameServersModule,
    GamesModule,
    QueueConfigModule,
    QueueModule,
  ],
  providers: [
    discordClientProvider,
    DiscordService,
    DiscordConfigurationService,
    AdminNotificationsService,
    QueuePromptsService,
    PlayerSubsNotificationsService,
    EmojiInstallerService,
  ],
  exports: [DiscordService],
  controllers: [DiscordController],
})
// skipca: JS-0327
export class DiscordModule {}
