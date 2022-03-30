export class PlayerAlreadyMarkedAsFriendError extends Error {
  constructor(public playerId: string) {
    super(`player ${playerId} is already marked as friend by another player`);
  }
}
