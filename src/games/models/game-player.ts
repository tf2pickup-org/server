import { prop } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';

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
