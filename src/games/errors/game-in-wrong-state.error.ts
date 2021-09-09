import { GameState } from '../models/game-state';

export class GameInWrongStateError extends Error {
  constructor(public gameId: string, public gameState: GameState) {
    super(`game ${gameId} is in wrong state (${gameState})`);
  }
}
