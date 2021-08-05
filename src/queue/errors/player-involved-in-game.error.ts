export class PlayerInvolvedInGameError extends Error {
  constructor(public playerId: string) {
    super(`player (${playerId}) is involved in a game`);
  }
}
