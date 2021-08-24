export class PlayerNotInThisGameError extends Error {
  constructor(
    public readonly playerId: string,
    public readonly gameId: string,
  ) {
    super(
      `player (id=${playerId}) does not take part in the game (id=${gameId})`,
    );
  }
}
