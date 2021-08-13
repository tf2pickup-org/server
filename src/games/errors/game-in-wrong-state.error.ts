import { GameState } from '../models/game-state';

export class GameInWrongStateError extends Error {
  constructor(public gameState: GameState) {
    super(`game in wrong state (${gameState})`);
  }
}
