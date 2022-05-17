import { Module, forwardRef } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { Game, gameSchema } from './models/game';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { GamesController } from './controllers/games.controller';
import { GamesGateway } from './gateways/games.gateway';
import { ServerConfiguratorService } from './services/server-configurator.service';
import { GameEventListenerService } from './services/game-event-listener.service';
import { GameLauncherService } from './services/game-launcher.service';
import { GameRuntimeService } from './services/game-runtime.service';
import { GameEventHandlerService } from './services/game-event-handler.service';
import { GamesWithSubstitutionRequestsController } from './controllers/games-with-substitution-requests.controller';
import { PlayerSubstitutionService } from './services/player-substitution.service';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { MongooseModule } from '@nestjs/mongoose';
import { GameConfigsModule } from '@/game-configs/game-configs.module';
import { Mutex } from 'async-mutex';
import { GameSerializerService } from './services/game-serializer.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
    forwardRef(() => GameServersModule),
    forwardRef(() => PlayersModule),
    QueueModule,

    ConfigurationModule,
    LogReceiverModule,
    GameConfigsModule,
  ],
  providers: [
    {
      provide: 'GAME_MODEL_MUTEX',
      useValue: new Mutex(),
    },
    GamesService,
    GamesGateway,
    ServerConfiguratorService,
    GameEventListenerService,
    GameLauncherService,
    GameRuntimeService,
    GameEventHandlerService,
    PlayerSubstitutionService,
    GameSerializerService,
  ],
  exports: [GamesService, GameRuntimeService],
  controllers: [GamesController, GamesWithSubstitutionRequestsController],
})
export class GamesModule {}
