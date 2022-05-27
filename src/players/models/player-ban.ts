import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { PlayerBanDto } from '../dto/player-ban.dto';

@Schema()
export class PlayerBan extends Serializable<PlayerBanDto> {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id?: Types.ObjectId;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  @IsMongoId()
  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: Types.ObjectId;

  @IsMongoId()
  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  admin!: Types.ObjectId;

  @IsNotEmpty()
  @Type(() => Date)
  @Prop({ required: true, default: () => Date.now() })
  start!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @Prop({ required: true })
  end!: Date;

  @IsString()
  @Prop()
  reason?: string;

  async serialize(): Promise<PlayerBanDto> {
    return {
      id: this.id,
      player: this.player.toString(),
      admin: this.admin.toString(),
      start: this.start,
      end: this.end,
      reason: this.reason,
    };
  }
}

export type PlayerBanDocument = PlayerBan & Document;
export const playerBanSchema = SchemaFactory.createForClass(PlayerBan);
