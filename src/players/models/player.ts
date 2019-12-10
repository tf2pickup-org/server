import { prop } from '@typegoose/typegoose';
import { PlayerRole } from './player-role';

export class Player {
  _id: string;

  @prop({ required: true, unique: true, trim: true })
  name!: string;

  @prop({ required: true, unique: true })
  public steamId!: string;

  @prop({ default: () => new Date() })
  public joinedAt?: Date;

  @prop()
  public avatarUrl?: string;

  @prop()
  public role?: PlayerRole;

  @prop({ default: false })
  public hasAcceptedRules!: boolean;

  @prop()
  public etf2lProfileId?: number;
}
