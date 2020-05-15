import { prop, index } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';

@index({ playerId: 1 })
@index({ status: 1 })
export class GamePlayer {
  @prop({ required: true })
  playerId!: string;

  @prop({ required: true })
  teamId!: string;

  @prop({ required: true })
  gameClass!: string;

  @prop({ default: 'active' })
  status?: 'active' | 'waiting for substitute' | 'replaced';

  @prop({ default: 'offline' })
  connectionStatus?: PlayerConnectionStatus;
}
