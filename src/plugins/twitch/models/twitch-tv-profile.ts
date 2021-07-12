import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { Types, Document } from 'mongoose';

@Schema()
export class TwitchTvProfile extends MongooseDocument {
  @Transform(({ value }) => value.toString())
  @Prop({ ref: 'Player', index: true })
  player?: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  login: string;

  @Prop()
  displayName?: string;

  @Prop()
  profileImageUrl?: string;
}

export type TwitchTvProfileDocument = TwitchTvProfile & Document;
export const twitchTvProfileSchema =
  SchemaFactory.createForClass(TwitchTvProfile);
