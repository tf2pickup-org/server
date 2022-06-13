import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { QueueConfigService } from './services/queue-config.service';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { MapVoteService } from './services/map-vote.service';
import { QueueGateway } from './gateways/queue.gateway';
import { QueueController } from './controllers/queue.controller';
import { AutoGameLauncherService } from './services/auto-game-launcher.service';
import { QueueAnnouncementsService } from './services/queue-announcements.service';
import { FriendsService } from './services/friends.service';
import { Environment } from '@/environment/environment';
import { join } from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
import { MapPoolService } from './services/map-pool.service';
import { MapPoolEntry, mapPoolEntrySchema } from './models/map-pool-entry';
import { MongooseModule } from '@nestjs/mongoose/dist';

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
  ],
  providers: [
    QueueService,
    QueueConfigService,
    MapVoteService,
    QueueGateway,
    AutoGameLauncherService,
    QueueAnnouncementsService,
    FriendsService,
    {
      provide: 'QUEUE_CONFIG_JSON',
      useFactory: async (environment: Environment) => {
        const configFileName = join(
          'configs',
          'queue',
          `${environment.queueConfig}.json`,
        );
        return promisify(readFile)(configFileName, 'utf-8');
      },
      inject: [Environment],
    },
    MapPoolService,
  ],
  exports: [
    QueueService,
    QueueConfigService,
    MapVoteService,
    QueueGateway,
    MapPoolService,
  ],
  controllers: [QueueController],
})
export class QueueModule {}
