import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { QueueConfigService } from './services/queue-config.service';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { MapVoteService } from './services/map-vote.service';
import { QueueGateway } from './gateways/queue.gateway';
import { QueueController } from './controllers/queue.controller';
import { QueueNotificationsService } from './services/queue-notifications.service';
import { DiscordModule } from '@/discord/discord.module';
import { AutoGameLauncherService } from './services/auto-game-launcher.service';
import { QueueAnnouncementsService } from './services/queue-announcements.service';

@Module({
  imports: [
    forwardRef(() => PlayersModule),
    forwardRef(() => GamesModule),
    DiscordModule,
  ],
  providers: [
    QueueService,
    QueueConfigService,
    MapVoteService,
    QueueGateway,
    QueueNotificationsService,
    AutoGameLauncherService,
    QueueAnnouncementsService,
  ],
  exports: [
    QueueService,
    QueueConfigService,
    MapVoteService,
    QueueGateway,
  ],
  controllers: [
    QueueController,
  ],
})
export class QueueModule { }
