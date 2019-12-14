import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { GameServersService } from './services/game-servers.service';
import { GameServersController } from './controllers/game-servers.controller';

@Module({
  imports: [
    TypegooseModule.forFeature([ GameServer ]),
  ],
  providers: [
    GameServersService,
  ],
  exports: [
    GameServersService,
  ],
  controllers: [
    GameServersController,
  ],
})
export class GameServersModule { }
