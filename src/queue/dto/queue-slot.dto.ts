import { PlayerDto } from '@/players/dto/player.dto';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Serializable } from '@/shared/serializable';

export interface QueueSlotDto {
  id: number;
  gameClass: Tf2ClassName;
  player?: Serializable<PlayerDto>;
  ready: boolean;
  canMakeFriendsWith?: Tf2ClassName[];
}
