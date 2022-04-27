export class CannotMarkPlayerAsFriendError extends Error {
  constructor(
    public sourcePlayerId: string,
    public sourceGameClass: string,
    public targetPlayerId: string,
    public targetGameClass: string,
  ) {
    super(
      `player ${sourcePlayerId} (added as ${sourceGameClass}) cannot mark ${targetPlayerId} (added as ${targetGameClass}) as friend`,
    );
  }
}
