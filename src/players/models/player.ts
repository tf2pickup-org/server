import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Link } from '@/shared/models/link';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { PlayerAvatar, playerAvatarSchema } from './player-avatar';
import { PlayerRole } from './player-role';

@Schema()
export class Player extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id?: string;

  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ unique: true })
  steamId?: string; // SteamID64 only

  @Prop({ default: () => new Date() })
  joinedAt?: Date;

  @Type(() => PlayerAvatar)
  @Prop({ type: playerAvatarSchema })
  avatar?: PlayerAvatar;

  @Prop({ type: () => [String], enum: PlayerRole, default: [] })
  roles?: PlayerRole[];

  @Exclude({ toPlainOnly: true })
  @Prop({ default: false })
  hasAcceptedRules?: boolean;

  @Prop({ index: true })
  etf2lProfileId?: number;

  @Exclude({ toPlainOnly: true })
  @Prop({ type: Types.ObjectId, ref: 'Game' })
  activeGame?: Types.ObjectId;

  @Expose()
  @Type(() => Link)
  get _links(): Link[] {
    return [
      new Link({
        href: `/players/${this.id}/linked-profiles`,
        title: 'Linked profiles',
      }),
    ];
  }
}

export type PlayerDocument = Player & Document;
export const playerSchema = SchemaFactory.createForClass(Player);
