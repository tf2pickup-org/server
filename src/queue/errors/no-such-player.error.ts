export class NoSuchPlayerError extends Error {
  constructor(public playerId: string) {
    super(`no such player (${playerId})`);
  }
}
