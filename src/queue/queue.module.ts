import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { MapVoteService } from './services/map-vote.service';
import { QueueGateway } from './gateways/queue.gateway';
import { QueueController } from './controllers/queue.controller';
import { AutoGameLauncherService } from './services/auto-game-launcher.service';
import { QueueAnnouncementsService } from './services/queue-announcements.service';
import { FriendsService } from './services/friends.service';
import { MapPoolService } from './services/map-pool.service';
import { MapPoolEntry, mapPoolEntrySchema } from './models/map-pool-entry';
import { MongooseModule } from '@nestjs/mongoose/dist';
import { QueueConfigModule } from '@/queue-config/queue-config.module';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { QueueConfigurationService } from './services/queue-configuration.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MapPoolEntry.name,
        schema: mapPoolEntrySchema,
      },
    ]),
    forwardRef(() => PlayersModule),
    forwardRef(() => GamesModule),
    QueueConfigModule,
    ConfigurationModule,
  ],
  providers: [
    QueueService,
    MapVoteService,
    QueueGateway,
    AutoGameLauncherService,
    QueueAnnouncementsService,
    FriendsService,

    MapPoolService,

    QueueConfigurationService,
  ],
  exports: [QueueService, MapVoteService, QueueGateway, MapPoolService],
  controllers: [QueueController],
})
export class QueueModule {}
