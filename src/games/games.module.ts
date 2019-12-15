import { Module, forwardRef } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Game } from './models/game';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { ConfigModule } from '@/config/config.module';
import { GameServersModule } from '@/game-servers/game-servers.module';
import { standardSchemaOptions } from '@/utils/standard-schema-options';

@Module({
  imports: [
    TypegooseModule.forFeature([ standardSchemaOptions(Game) ]),
    ConfigModule,
    GameServersModule,
    forwardRef(() => PlayersModule),
    QueueModule,
  ],
  providers: [
    GamesService,
  ],
  exports: [
    GamesService,
  ],
})
export class GamesModule { }
