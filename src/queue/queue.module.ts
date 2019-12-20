import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { QueueConfigService } from './services/queue-config.service';
import { ConfigModule } from '@/config/config.module';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { MapVoteService } from './services/map-vote.service';
import { GameLauncherService } from './services/game-launcher.service';
import { QueueGateway } from './gateways/queue.gateway';
import { QueueController } from './controllers/queue.controller';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => PlayersModule),
    forwardRef(() => GamesModule),
  ],
  providers: [
    QueueService,
    QueueConfigService,
    MapVoteService,
    GameLauncherService,
    QueueGateway,
  ],
  exports: [
    QueueService,
    QueueConfigService,
  ],
  controllers: [QueueController],
})
export class QueueModule { }
