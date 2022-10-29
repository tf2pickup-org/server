import { Player } from '@/players/models/player';

export class PlayerDeniedError extends Error {
  constructor(public readonly player: Player, public readonly reason: string) {
    super(`player ${player.name} denied from joining the queue (${reason})`);
  }
}
