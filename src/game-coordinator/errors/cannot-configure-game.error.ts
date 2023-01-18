import { Game } from '@/games/models/game';

export class CannotConfigureGameError extends Error {
  constructor(
    public readonly game: Game,
    public readonly errorMessage: string,
  ) {
    super(
      `cannot configure game #${game.number}${
        game.gameServer ? `(using gameserver ${game.gameServer.name})` : ''
      }: ${errorMessage}`,
    );
  }
}
