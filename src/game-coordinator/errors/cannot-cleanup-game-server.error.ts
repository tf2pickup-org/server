import { GameServerOptionWithProvider } from '@/game-servers/interfaces/game-server-option';

export class CannotCleanupGameServerError extends Error {
  constructor(
    public readonly gameServer: GameServerOptionWithProvider,
    public readonly errorMessage: string,
  ) {
    super(`could not cleanup server ${gameServer.name}: ${errorMessage}`);
  }
}
