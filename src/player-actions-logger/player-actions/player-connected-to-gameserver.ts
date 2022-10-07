import { Game } from '@/games/models/game';
import { Player } from '@/players/models/player';
import { UserMetadata } from '@/shared/user-metadata';
import { PlayerAction } from './player-action';

export class PlayerConnectedToGameserver extends PlayerAction {
  constructor(
    player: Player,
    metadata: UserMetadata,
    public readonly game: Game,
  ) {
    super(player, metadata);
  }

  toString(): string {
    return `connect to gameserver (game #${this.game.number})`;
  }
}
