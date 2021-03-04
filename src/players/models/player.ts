import { RemoveVersionKey } from '@/utils/remove-version-key';
import { prop, index } from '@typegoose/typegoose';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { PlayerAvatar } from './player-avatar';
import { PlayerRole } from './player-role';
import { TwitchTvUser } from './twitch-tv-user';

@index({ steamId: 'hashed' })
export class Player extends RemoveVersionKey {

  @Exclude({ toPlainOnly: true })
  @Transform(({ value }) => value.toString())
  _id?: string;

  @Expose()
  get id() {
    return this._id;
  }

  @IsString()
  @prop({ required: true, unique: true, trim: true })
  name!: string;

  @Matches(/^\d{17}$/)
  @prop({ unique: true })
  steamId?: string; // SteamID64 only

  @prop({ default: () => new Date() })
  joinedAt?: Date;

  @Type(() => PlayerAvatar)
  @prop()
  avatar?: PlayerAvatar;

  @prop()
  role?: PlayerRole;

  @Exclude({ toPlainOnly: true })
  @prop({ default: false })
  hasAcceptedRules?: boolean;

  @prop({ index: true })
  etf2lProfileId?: number;

  @Type(() => TwitchTvUser)
  @prop({ type: TwitchTvUser })
  twitchTvUser?: TwitchTvUser;

}
