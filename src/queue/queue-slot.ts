import { PlayerId } from '@/players/types/player-id';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface QueueSlot {
  id: number;
  gameClass: Tf2ClassName;
  playerId: PlayerId | null;
  ready: boolean;
  canMakeFriendsWith?: Tf2ClassName[];
}
