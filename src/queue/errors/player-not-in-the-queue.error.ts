import { PlayerId } from '@/players/types/player-id';

export class PlayerNotInTheQueueError extends Error {
  constructor(public playerId: PlayerId) {
    super(`player (${playerId}) not in the queue`);
  }
}
