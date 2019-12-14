import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { GameServersService } from './services/game-servers.service';
import { GameServersController } from './controllers/game-servers.controller';
import { renameId, chain, removeRconPassword } from '@/utils/tojson-transform';

@Module({
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: GameServer,
        schemaOptions: {
          toJSON: {
            versionKey: false,
            transform: chain(renameId, removeRconPassword),
          },
        },
      },
    ]),
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
