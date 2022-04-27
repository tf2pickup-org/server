import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface QueueSlot {
  id: number;
  gameClass: Tf2ClassName;
  playerId: string | null;
  ready: boolean;
  canMakeFriendsWith?: Tf2ClassName[];
}
