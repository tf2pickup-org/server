import { GameId } from '../game-id';
import { GameState } from '../models/game-state';

export class GameInWrongStateError extends Error {
  constructor(public gameId: GameId, public gameState: GameState) {
    super(`game ${gameId} is in wrong state (${gameState})`);
  }
}
