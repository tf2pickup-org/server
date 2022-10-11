import { Player } from '@/players/models/player';
import { UserMetadata } from '@/shared/user-metadata';
import { PlayerAction } from './player-action';

export class PlayerOnlineStatusChanged extends PlayerAction {
  constructor(
    player: Player,
    metadata: UserMetadata,
    public readonly online: boolean,
  ) {
    super(player, metadata);
  }

  toString(): string {
    return `went ${this.online ? 'online' : 'offline'}`;
  }
}
