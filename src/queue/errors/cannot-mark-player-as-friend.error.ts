import { PlayerId } from '@/players/types/player-id';

export class CannotMarkPlayerAsFriendError extends Error {
  constructor(
    public readonly sourcePlayerId: PlayerId,
    public readonly sourceGameClass: string,
    public readonly targetPlayerId: PlayerId,
    public readonly targetGameClass: string,
  ) {
    super(
      `player ${sourcePlayerId.toString()} (added as ${sourceGameClass}) cannot mark ${targetPlayerId.toString()} (added as ${targetGameClass}) as friend`,
    );
  }
}
