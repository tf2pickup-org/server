import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { GameServer } from './models/game-server';
import { DocumentType } from '@typegoose/typegoose';
import { GameServersService } from './services/game-servers.service';

function removeRcon(doc: DocumentType<GameServer>, ret: any) {
  delete ret.rconPassword;
  return ret;
}

@Module({
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: GameServer,
        schemaOptions: {
          toJSON: {
            transform: removeRcon,
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
})
export class GameServersModule { }
