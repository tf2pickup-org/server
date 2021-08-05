export class PlayerIsBannedError extends Error {
  constructor(public playerId: string) {
    super(`player (${playerId}) is banned`);
  }
}
