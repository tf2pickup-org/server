import { GameServer } from '@/games/models/game-server';

export class CannotConfigureGameError extends Error {
  constructor(
    public readonly gameServer: GameServer,
    public readonly errorMessage: string,
  ) {
    super(`cannot configure gameserver ${gameServer.name}: ${errorMessage}`);
  }
}
