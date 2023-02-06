import { PlayerId } from '@/players/types/player-id';

export class CannotMarkPlayerAsFriendError extends Error {
  constructor(
    public sourcePlayerId: PlayerId,
    public sourceGameClass: string,
    public targetPlayerId: PlayerId,
    public targetGameClass: string,
  ) {
    super(
      `player ${sourcePlayerId} (added as ${sourceGameClass}) cannot mark ${targetPlayerId} (added as ${targetGameClass}) as friend`,
    );
  }
}
