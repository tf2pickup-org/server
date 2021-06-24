import { prop, Ref } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';
import { Tf2Team } from './tf2-team';
import { Player } from '@/players/models/player';
import { SlotStatus } from './slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export class GameSlot {
  @prop({ required: true, ref: () => Player, index: true })
  player!: Ref<Player>;

  @prop({ required: true, enum: Tf2Team })
  team!: Tf2Team;

  @prop({ required: true, enum: Tf2ClassName })
  gameClass!: Tf2ClassName;

  @prop({ index: true, enum: SlotStatus, default: SlotStatus.active })
  status?: SlotStatus;

  @prop({
    enum: PlayerConnectionStatus,
    default: PlayerConnectionStatus.offline,
  })
  connectionStatus?: PlayerConnectionStatus;
}
