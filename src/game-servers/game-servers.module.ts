import { forwardRef, Module } from '@nestjs/common';
import { GameServersService } from './services/game-servers.service';
import { GamesModule } from '@/games/games.module';
import { MongooseModule } from '@nestjs/mongoose';
import { GameServer, gameServerSchema } from './models/game-server';
import { GameServersProvidersModule } from './providers/game-servers-providers.module';
import { GameServersController } from './controllers/game-servers.controller';

const gameServerModelProvider = MongooseModule.forFeature([
  {
    name: GameServer.name,
    schema: gameServerSchema,
    // Note: we are not declaring any discriminators here, despite it ought to be the
    // NestJS' 'canonical' way. Instead, we're going for more modular approach and defining
    // discriminators in each module.
  },
]);

@Module({
  imports: [
    gameServerModelProvider,
    GameServersProvidersModule.configure(),
    forwardRef(() => GamesModule),
  ],
  providers: [GameServersService],
  exports: [GameServersService, gameServerModelProvider],
  controllers: [GameServersController],
})
export class GameServersModule {}
