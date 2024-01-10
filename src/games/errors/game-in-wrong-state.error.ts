import { GameId } from '../game-id';
import { GameState } from '../models/game-state';

export class GameInWrongStateError extends Error {
  constructor(
    public readonly gameId: GameId,
    public readonly gameState: GameState,
  ) {
    super(`game ${gameId.toString()} is in wrong state (${gameState})`);
  }
}
