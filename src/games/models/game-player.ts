import { prop, index, Ref } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';
import { Player } from '@/players/models/player';

@index({ playerId: 1 })
@index({ status: 1 })
export class GamePlayer {

  @prop({ required: true, ref: 'Player' })
  player!: Ref<Player>;

  @prop({ required: true })
  teamId!: string;

  @prop({ required: true })
  gameClass!: string;

  @prop({ default: 'active' })
  status?: 'active' | 'waiting for substitute' | 'replaced';

  @prop({ default: 'offline' })
  connectionStatus?: PlayerConnectionStatus;

}
