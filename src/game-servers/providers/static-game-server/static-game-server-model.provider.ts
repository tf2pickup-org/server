import {
  GameServerDocument,
  GameServer,
} from '@/game-servers/models/game-server';
import { GameServerProvider } from '@/game-servers/models/game-server-provider';
import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StaticGameServer,
  staticGameServerSchema,
} from './models/static-game-server';

export const staticGameServerModelProvider: Provider = {
  provide: getModelToken(StaticGameServer.name),
  useFactory: (gameServerModel: Model<GameServerDocument>) =>
    gameServerModel.discriminator(
      GameServerProvider.static,
      staticGameServerSchema,
    ),
  inject: [getModelToken(GameServer.name)],
};
