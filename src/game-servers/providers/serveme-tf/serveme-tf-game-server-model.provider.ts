import {
  GameServer,
  GameServerDocument,
} from '@/game-servers/models/game-server';
import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ServemeTfGameServer,
  servemeTfGameServerSchema,
} from './models/serveme-tf-game-server';

export const servemeTfGameServerModelProvider: Provider = {
  provide: getModelToken(ServemeTfGameServer.name),
  useFactory: (gameServerModel: Model<GameServerDocument>) =>
    gameServerModel.discriminator('serveme.tf', servemeTfGameServerSchema),
  inject: [getModelToken(GameServer.name)],
};
