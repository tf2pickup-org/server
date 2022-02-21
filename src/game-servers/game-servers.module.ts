import { forwardRef, Module } from '@nestjs/common';
import { GameServersService } from './services/game-servers.service';
import { LogReceiverModule } from '@/log-receiver/log-receiver.module';
import { GamesModule } from '@/games/games.module';
import { StaticGameServerModule } from './providers/static-game-server/static-game-server.module';
import { MongooseModule } from '@nestjs/mongoose';
import { GameServer, GameServerSchema } from './models/game-server';
import { GameServerProvider } from './models/game-server-provider';
import { staticGameServerSchema } from './providers/static-game-server/models/static-game-server';

@Module({
  imports: [
    LogReceiverModule,
    forwardRef(() => GamesModule),
    MongooseModule.forFeature([
      {
        name: GameServer.name,
        schema: GameServerSchema,
        discriminators: [
          {
            name: GameServerProvider.static,
            schema: staticGameServerSchema,
          },
        ],
      },
    ]),
    StaticGameServerModule,
  ],
  exports: [GameServersService],
})
export class GameServersModule {}
