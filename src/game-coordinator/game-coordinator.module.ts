import { ConfigurationModule } from '@/configuration/configuration.module';
import { GameConfigsModule } from '@/game-configs/game-configs.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { GamesModule } from '@/games/games.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { Module } from '@nestjs/common';
import { GameEventListenerService } from './services/game-event-listener.service';
import { GameLauncherService } from './services/game-launcher.service';
import { GameRuntimeService } from './services/game-runtime.service';
import { ServerConfiguratorService } from './services/server-configurator.service';

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
    GameLauncherService,
    GameRuntimeService,
    GameEventListenerService,
  ],
  exports: [GameRuntimeService],
})
export class GameCoordinatorModule {}
