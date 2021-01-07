import { prop, Ref } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';
import { Tf2Team } from './tf2-team';
import { Player } from '@/players/models/player';
import { SlotStatus } from './slot-status';

export class GamePlayer {

  @prop({ required: true, ref: Player, index: true })
  player!: Ref<Player>;

  @prop({ required: true, enum: Tf2Team })
  team!: Tf2Team;

  @prop({ required: true })
  gameClass!: string;

  @prop({ index: true, enum: SlotStatus, default: SlotStatus.Active })
  status?: SlotStatus;

  @prop({ default: 'offline' })
  connectionStatus?: PlayerConnectionStatus;

}
