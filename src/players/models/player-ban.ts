import { isRefType, prop, Ref } from '@typegoose/typegoose';
import { Player } from './player';
import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Expose, Transform, Type } from 'class-transformer';

export class PlayerBan extends MongooseDocument {

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  @IsMongoId()
  @Transform(({ value }) => isRefType(value) ? value.toString() : value)
  @prop({ ref: () => Player, required: true })
  player!: Ref<Player>;

  @IsMongoId()
  @Transform(({ value }) => isRefType(value) ? value.toString() : value)
  @prop({ ref: () => Player, required: true })
  admin!: Ref<Player>;

  @IsNotEmpty()
  @Type(() => Date)
  @prop({ required: true, default: () => Date.now() })
  start!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @prop({ required: true })
  end!: Date;

  @IsString()
  @prop()
  reason?: string;
}
