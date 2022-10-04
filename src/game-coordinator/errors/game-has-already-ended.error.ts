export class GameHasAlreadyEndedError extends Error {
  constructor(gameId: string) {
    super(`game ${gameId} has already ended`);
  }
}
