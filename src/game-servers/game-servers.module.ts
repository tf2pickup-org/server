import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { GameServersService } from './services/game-servers.service';
import { GameServersController } from './controllers/game-servers.controller';
import { removeRconPassword } from '@/utils/tojson-transform';
import { standardSchemaOptions } from '@/utils/standard-schema-options';
import { GameEventListenerService } from './services/game-event-listener.service';

@Module({
  imports: [
    TypegooseModule.forFeature([ standardSchemaOptions(GameServer, removeRconPassword) ]),
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
