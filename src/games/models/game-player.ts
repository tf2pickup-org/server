import { prop, Ref } from '@typegoose/typegoose';
import { PlayerConnectionStatus } from './player-connection-status';
import { Tf2Team } from './tf2-team';
import { Player } from '@/players/models/player';

export class GamePlayer {

  @prop({ required: true, ref: Player, index: true })
  player!: Ref<Player>;

  @prop({ required: true, enum: Tf2Team })
  team!: Tf2Team;

  @prop({ required: true })
  gameClass!: string;

  @prop({ default: 'active', index: true })
  status?: 'active' | 'waiting for substitute' | 'replaced';

  @prop({ default: 'offline' })
  connectionStatus?: PlayerConnectionStatus;

}
