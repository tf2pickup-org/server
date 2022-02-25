import { forwardRef, Module } from '@nestjs/common';
import { GameServersService } from './services/game-servers.service';
import { GamesModule } from '@/games/games.module';
import { MongooseModule } from '@nestjs/mongoose';
import { GameServer, GameServerSchema } from './models/game-server';
import { GameServerProvider } from './models/game-server-provider';
import { staticGameServerSchema } from './providers/static-game-server/models/static-game-server';
import { GameServersProvidersModule } from './providers/game-servers-providers.module';

const mongooseModule = MongooseModule.forFeature([
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
]);

@Module({
  imports: [
    forwardRef(() => GamesModule),
    mongooseModule,
    GameServersProvidersModule.configure(),
  ],
  providers: [GameServersService],
  exports: [GameServersService, mongooseModule],
})
export class GameServersModule {}
