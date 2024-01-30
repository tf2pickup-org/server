import { Module, forwardRef } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { Game, gameSchema } from './models/game';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { GamesController } from './controllers/games.controller';
import { GamesGateway } from './gateways/games.gateway';
import { GameEventHandlerService } from './services/game-event-handler.service';
import { GamesWithSubstitutionRequestsController } from './controllers/games-with-substitution-requests.controller';
import { PlayerSubstitutionService } from './services/player-substitution.service';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Mutex } from 'async-mutex';
import { GameServerAssignerService } from './services/game-server-assigner.service';
import { QueueConfigModule } from '@/queue-config/queue-config.module';
import { GamesConfigurationService } from './services/games-configuration.service';
import { GameSlotsGateway } from './gateways/game-slots.gateway';
import { VoiceChannelUrlsService } from './services/voice-channel-urls.service';
import { GAME_MODEL_MUTEX } from './tokens/game-model-mutex.token';
import { GameLogsService } from './services/game-logs.service';
import { GameLogs, gameLogsSchema } from './models/game-logs';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { LogsTfModule } from '@/logs-tf/logs-tf.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: gameSchema },
      { name: GameLogs.name, schema: gameLogsSchema },
    ]),
    forwardRef(() => GameServersModule),
    forwardRef(() => PlayersModule),
    QueueModule,
    ConfigurationModule,
    QueueConfigModule,
    LogReceiverModule,
    LogsTfModule,
  ],
  providers: [
    {
      provide: GAME_MODEL_MUTEX,
      useValue: new Mutex(),
    },
    GamesService,
    GamesGateway,
    GameEventHandlerService,
    PlayerSubstitutionService,
    GameServerAssignerService,
    GamesConfigurationService,
    GameSlotsGateway,
    VoiceChannelUrlsService,
    GameLogsService,
  ],
  exports: [GamesService, PlayerSubstitutionService],
  controllers: [GamesController, GamesWithSubstitutionRequestsController],
})
export class GamesModule {}
