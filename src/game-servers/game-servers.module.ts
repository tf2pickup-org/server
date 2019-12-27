import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { GameServersService } from './services/game-servers.service';
import { GameServersController } from './controllers/game-servers.controller';
import { removeRconPassword } from '@/utils/tojson-transform';
import { standardSchemaOptions } from '@/utils/standard-schema-options';
import { GameEventListenerService } from './services/game-event-listener.service';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    TypegooseModule.forFeature([ standardSchemaOptions(GameServer, removeRconPassword) ]),
    ConfigModule,
  ],
  providers: [
    GameServersService,
    GameEventListenerService,
  ],
  exports: [
    GameServersService,
    GameEventListenerService,
  ],
  controllers: [
    GameServersController,
  ],
})
export class GameServersModule { }
