export class PlayerNotInTheQueueError extends Error {
  constructor(public playerId: string) {
    super(`player (${playerId}) not in the queue`);
  }
}
