import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({
  collection: 'configuration',
  id: false,
  _id: false,
})
export class ConfigurationItem {
  @Prop({ unique: true })
  key!: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  value: unknown;
}

export const configurationItemSchema =
  SchemaFactory.createForClass(ConfigurationItem);
