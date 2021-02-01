import { prop, index } from '@typegoose/typegoose';
import { IsString, Matches } from 'class-validator';
import { PlayerAvatar } from './player-avatar';
import { PlayerRole } from './player-role';
import { TwitchTvUser } from './twitch-tv-user';

@index({ steamId: 'hashed' })
export class Player {
  id?: string;
  _id?: string;

  @IsString()
  @prop({ required: true, unique: true, trim: true })
  name!: string;

  @Matches(/^\d{17}$/)
  @prop({ unique: true })
  steamId?: string;

  @prop({ default: () => new Date() })
  joinedAt?: Date;

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
