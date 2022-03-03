import {
  GameServerDocument,
  GameServer,
} from '@/game-servers/models/game-server';
import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StaticGameServer,
  staticGameServerSchema,
} from './models/static-game-server';
import { staticGameServerProviderName } from './static-game-server-provider-name';

export const staticGameServerModelProvider: Provider = {
  provide: getModelToken(StaticGameServer.name),
  useFactory: (gameServerModel: Model<GameServerDocument>) =>
    gameServerModel.discriminator(
      staticGameServerProviderName,
      staticGameServerSchema,
    ),
  inject: [getModelToken(GameServer.name)],
};
