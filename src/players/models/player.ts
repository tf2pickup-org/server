import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { PlayerAvatar, playerAvatarSchema } from './player-avatar';
import { PlayerRole } from './player-role';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { PlayerDto } from '../dto/player.dto';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

@Schema()
export class Player extends Serializable<PlayerDto> {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id!: Types.ObjectId;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id!: string;

  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ unique: true })
  steamId!: string; // SteamID64 only

  @Prop({ default: () => new Date() })
  joinedAt!: Date;

  @Type(() => PlayerAvatar)
  @Prop({ type: playerAvatarSchema })
  avatar?: PlayerAvatar;

  @Prop({ type: () => [String], enum: PlayerRole, default: [] })
  roles: PlayerRole[] = [];

  @Exclude({ toPlainOnly: true })
  @Prop({ type: Boolean, default: false })
  hasAcceptedRules = false;

  @Prop({ index: true })
  etf2lProfileId?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  @Prop({ ref: 'Game' })
  activeGame?: Types.ObjectId;

  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  skill?: Map<Tf2ClassName, number>;

  @Prop({ default: 0 })
  gamesPlayed!: number;

  serialize(): PlayerDto {
    return {
      id: this.id,
      name: this.name,
      steamId: this.steamId,
      joinedAt: this.joinedAt.toISOString(),
      avatar: this.avatar
        ? {
            small: this.avatar.small,
            medium: this.avatar.medium,
            large: this.avatar.large,
          }
        : {},
      roles: this.roles,
      etf2lProfileId: this.etf2lProfileId,
      gamesPlayed: this.gamesPlayed,
      _links: [
        {
          href: `/players/${this.id}/linked-profiles`,
          title: 'Linked profiles',
        },
      ],
    };
  }
}

export type PlayerDocument = Player & Document;
export const playerSchema = SchemaFactory.createForClass(Player);
