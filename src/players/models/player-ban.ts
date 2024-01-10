import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { PlayerBanDto } from '../dto/player-ban.dto';
import { PlayerId } from '../types/player-id';
import { PlayerBanId } from '../types/player-ban-id';

@Schema()
export class PlayerBan extends Serializable<PlayerBanDto> {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id!: PlayerBanId;

  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id!: string;

  @IsMongoId()
  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: PlayerId;

  @IsMongoId()
  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  admin!: PlayerId;

  @IsNotEmpty()
  @Type(() => Date)
  @Prop({ required: true, default: () => new Date() })
  start!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @Prop({ required: true })
  end!: Date;

  @IsString()
  @Prop()
  reason?: string;

  serialize(): PlayerBanDto {
    return {
      id: this.id,
      player: this.player.toString(),
      admin: this.admin.toString(),
      start: this.start.toISOString(),
      end: this.end.toISOString(),
      reason: this.reason,
    };
  }
}

export type PlayerBanDocument = PlayerBan & Document;
export const playerBanSchema = SchemaFactory.createForClass(PlayerBan);
