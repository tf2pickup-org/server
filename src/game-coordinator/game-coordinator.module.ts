import { ConfigurationModule } from '@/configuration/configuration.module';
import { GameConfigsModule } from '@/game-configs/game-configs.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { GamesModule } from '@/games/games.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { Module } from '@nestjs/common';
import { GameEventListenerService } from './services/game-event-listener.service';
import { GameRuntimeService } from './services/game-runtime.service';
import { ServerConfiguratorService } from './services/server-configurator.service';
import { ServerCleanupService } from './services/server-cleanup.service';

@Module({
  imports: [
    GamesModule,
    PlayersModule,
    QueueModule,
    ConfigurationModule,
    GameConfigsModule,
    GameServersModule,
    LogReceiverModule,
  ],
  providers: [
    ServerConfiguratorService,
    GameRuntimeService,
    GameEventListenerService,
    ServerCleanupService,
  ],
  exports: [GameRuntimeService],
})
export class GameCoordinatorModule {}
