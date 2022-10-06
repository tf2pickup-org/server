import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { Document } from 'mongodb';
import { Types } from 'mongoose';

@Schema({ collection: 'playeractions' })
export class PlayerActionEntry {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id?: Types.ObjectId;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player: Types.ObjectId;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  action: string;

  @Prop({ default: () => new Date() })
  timestamp: Date;
}

export type PlayerActionEntryDocument = PlayerActionEntry & Document;
export const playerActionEntrySchema =
  SchemaFactory.createForClass(PlayerActionEntry);
