import { plainToInstance } from 'class-transformer';
import { LeanDocument } from 'mongoose';
import { GameServerDocument } from './models/game-server';
import { GameServerProvider } from './models/game-server-provider';
import { StaticGameServer } from './providers/static-game-server/models/static-game-server';

export const instantiateGameServer = (
  plain: LeanDocument<GameServerDocument>,
) => {
  switch (plain.provider) {
    case GameServerProvider.static:
      return plainToInstance(StaticGameServer, plain);

    default:
      throw new Error(`unknown gameserver provider: ${plain.provider}`);
  }
};
