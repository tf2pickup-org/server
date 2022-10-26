import { forwardRef, Module } from '@nestjs/common';
import { GameServersService } from './services/game-servers.service';
import { GamesModule } from '@/games/games.module';
import { GameServersProvidersModule } from './providers/game-servers-providers.module';
import { GameServersController } from './controllers/game-servers.controller';

@Module({
  imports: [
    GameServersProvidersModule.configure(),
    forwardRef(() => GamesModule),
  ],
  providers: [GameServersService],
  exports: [GameServersService, GameServersProvidersModule],
  controllers: [GameServersController],
})
export class GameServersModule {}
