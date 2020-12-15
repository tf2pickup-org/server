import { prop, index } from '@typegoose/typegoose';
import { PlayerAvatar } from './player-avatar';
import { PlayerRole } from './player-role';
import { TwitchTvUser } from './twitch-tv-user';

@index({ steamId: 'hashed' })
export class Player {
  id: string;

  @prop({ required: true, unique: true, trim: true })
  name!: string;

  @prop({ unique: true })
  steamId?: string;

  @prop({ default: () => new Date() })
  joinedAt?: Date;

  // TODO 3.0: remove
  @prop()
  avatarUrl?: string; // deprecated

  @prop()
  avatar?: PlayerAvatar;

  @prop()
  role?: PlayerRole;

  @prop({ default: false })
  hasAcceptedRules?: boolean;

  @prop({ index: true })
  etf2lProfileId?: number;

  @prop({ type: TwitchTvUser })
  twitchTvUser?: TwitchTvUser;

}
