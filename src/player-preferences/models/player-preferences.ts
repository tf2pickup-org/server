import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class PlayerPreferences {
  @Prop({ ref: 'Player', unique: true })
  player?: Types.ObjectId;

  @Prop(
    raw({
      type: Map,
      of: String,
    }),
  )
  preferences: Map<string, string>;
}

export type PlayerPreferencesDocument = PlayerPreferences & Document;
export const playerPreferencesSchema =
  SchemaFactory.createForClass(PlayerPreferences);
