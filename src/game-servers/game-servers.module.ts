import { forwardRef, Module } from '@nestjs/common';
import { GameServersService } from './services/game-servers.service';
import { GamesModule } from '@/games/games.module';
import { GameServersProvidersModule } from './providers/game-servers-providers.module';
import { StaticGameServerModule } from './providers/static-game-server/static-game-server.module';

@Module({
  imports: [
    GameServersProvidersModule.configure(),
    forwardRef(() => GamesModule),

    // FIXME This is a workaround for (probably) as NestJS bug, this shouldn't be needed here.
    StaticGameServerModule,
  ],
  providers: [GameServersService],
  exports: [GameServersService, GameServersProvidersModule],
})
export class GameServersModule {}
