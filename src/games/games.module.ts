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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
    forwardRef(() => GameServersModule),
    forwardRef(() => PlayersModule),
    QueueModule,
    ConfigurationModule,
    QueueConfigModule,
  ],
  providers: [
    {
      provide: 'GAME_MODEL_MUTEX',
      useValue: new Mutex(),
    },
    GamesService,
    GamesGateway,
    GameEventHandlerService,
    PlayerSubstitutionService,
    GameServerAssignerService,
  ],
  exports: [GamesService, PlayerSubstitutionService],
  controllers: [GamesController, GamesWithSubstitutionRequestsController],
})
export class GamesModule {}
