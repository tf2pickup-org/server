import { Game } from '../models/game';

export class CannotAssignGameServerError extends Error {
  constructor(public readonly game: Game, public readonly reason: string) {
    super(`cannot assign a gameserver to game #${game.number}: ${reason}`);
  }
}
