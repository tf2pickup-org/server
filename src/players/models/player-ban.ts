import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Expose, Transform, Type } from 'class-transformer';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ExposeId } from '@/shared/decorators/expose-id';

@Schema()
export class PlayerBan extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  @IsMongoId()
  // @Transform(({ value, obj }) => {
  //   console.log(value + '===' + obj.player);
  //   return obj.player.toString();
  // })
  @ExposeId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: Types.ObjectId;

  @IsMongoId()
  @ExposeId()
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
}

export type PlayerBanDocument = PlayerBan & Document;
export const playerBanSchema = SchemaFactory.createForClass(PlayerBan);
