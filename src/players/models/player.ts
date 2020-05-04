import { prop } from '@typegoose/typegoose';
import { PlayerRole } from './player-role';

export class Player {
  id: string;

  @prop({ required: true, unique: true, trim: true })
  name!: string;

  @prop({ required: true, unique: true })
  steamId!: string;

  @prop({ default: () => new Date() })
  joinedAt?: Date;

  @prop()
  avatarUrl?: string;

  @prop()
  role?: PlayerRole;

  @prop({ default: false })
  hasAcceptedRules!: boolean;

  @prop()
  etf2lProfileId?: number;

  @prop()
  twitchTvUserId?: string;
}
