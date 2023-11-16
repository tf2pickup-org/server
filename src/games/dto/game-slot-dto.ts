import { PlayerDto } from '@/players/dto/player.dto';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Serializable } from '@/shared/serializable';
import { Tf2Team } from '../models/tf2-team';
import { SlotStatus } from '../models/slot-status';
import { PlayerConnectionStatus } from '../models/player-connection-status';

export interface GameSlotDto {
  player: Serializable<PlayerDto>;
  team: Tf2Team;
  gameClass: Tf2ClassName;
  status: SlotStatus;
  connectionStatus: PlayerConnectionStatus;
}
