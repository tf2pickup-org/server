import { PlayerId } from '@/players/types/player-id';

export class PlayerNotInTheQueueError extends Error {
  constructor(public playerId: PlayerId) {
    super(`player (${playerId.toString()}) not in the queue`);
  }
}
