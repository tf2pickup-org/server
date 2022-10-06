import { Player } from '@/players/models/player';
import { UserMetadata } from '@/shared/user-metadata';

export abstract class PlayerAction {
  constructor(
    public readonly player: Player,
    public readonly metadata: UserMetadata,
  ) {}

  abstract toString(): string;
}
