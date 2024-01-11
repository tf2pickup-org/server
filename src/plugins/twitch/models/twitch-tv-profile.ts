import { PlayerId } from '@/players/types/player-id';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class TwitchTvProfile extends MongooseDocument {
  @TransformObjectId()
  @Prop({ type: Types.ObjectId, ref: 'Player', index: true, required: true })
  player!: PlayerId;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  login!: string;

  @Prop()
  displayName?: string;

  @Prop()
  profileImageUrl?: string;
}

export const twitchTvProfileSchema =
  SchemaFactory.createForClass(TwitchTvProfile);
