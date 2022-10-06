import { Player } from '@/players/models/player';
import { UserMetadata } from '@/shared/user-metadata';
import { PlayerAction } from './player-action';

export class PlayerSaidInMatchChat extends PlayerAction {
  constructor(
    player: Player,
    metadata: UserMetadata,
    public readonly message: string,
  ) {
    super(player, metadata);
  }

  toString(): string {
    return `said "${this.message}"`;
  }
}
