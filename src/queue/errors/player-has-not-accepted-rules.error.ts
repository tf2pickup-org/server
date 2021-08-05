export class PlayerHasNotAcceptedRulesError extends Error {
  constructor(public playerId: string) {
    super(`player (${playerId}) has not accepted rules`);
  }
}
