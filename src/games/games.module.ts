import { Module, forwardRef } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Game } from './models/game';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { standardSchemaOptions } from '@/utils/standard-schema-options';
import { GamesController } from './controllers/games.controller';
import { removeGameAssignedSkills } from '@/utils/tojson-transform';
import { GamesGateway } from './gateways/games.gateway';
import { ServerConfiguratorService } from './services/server-configurator.service';

@Module({
  imports: [
    TypegooseModule.forFeature([ standardSchemaOptions(Game, removeGameAssignedSkills) ]),
    GameServersModule,
    forwardRef(() => PlayersModule),
    QueueModule,
  ],
  providers: [
    GamesService,
    GamesGateway,
    ServerConfiguratorService,
  ],
  exports: [
    GamesService,
  ],
  controllers: [
    GamesController,
  ],
})
export class GamesModule { }
