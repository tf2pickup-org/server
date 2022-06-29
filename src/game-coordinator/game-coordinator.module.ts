import { ConfigurationModule } from '@/configuration/configuration.module';
import { GameConfigsModule } from '@/game-configs/game-configs.module';
import { GamesModule } from '@/games/games.module';
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
  ],
  providers: [
    ServerConfiguratorService,
    GameLauncherService,
    GameRuntimeService,
    GameEventListenerService,
  ],
})
export class GameCoordinatorModule {}
