import { Player } from '@/players/models/player';
import { Serializable } from '@/shared/serializable';

export interface PlayerActionDto {
  player: Player | Serializable<Player>;
  timestamp: string;
  action: string;

  ipAddress?: string;
  userAgent?: string;
}
