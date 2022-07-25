export class GameServerNotAssignedError extends Error {
  constructor(gameId: string) {
    super(`game ${gameId} has no gameserver assigned`);
  }
}
