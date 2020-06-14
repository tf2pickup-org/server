import { prop, index, Ref } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';
import { Tf2Team } from './tf2-team';
import { Player } from '@/players/models/player';

@index({ playerId: 1 })
@index({ status: 1 })
export class GamePlayer {

  @prop({ required: true, ref: Player })
  player!: Ref<Player>;

  @prop({ required: true, enum: Tf2Team })
  team!: Tf2Team;

  @prop({ required: true })
  gameClass!: string;

  @prop({ default: 'active' })
  status?: 'active' | 'waiting for substitute' | 'replaced';

  @prop({ default: 'offline' })
  connectionStatus?: PlayerConnectionStatus;

}
