import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema({
  collection: 'configuration',
})
export class ConfigurationEntry {
  @Prop({ enum: ConfigurationEntryKey, unique: true })
  key: ConfigurationEntryKey;

  @Prop()
  value: string;
}

export type ConfigurationEntryDocument = ConfigurationEntry & Document;
export const configurationEntrySchema =
  SchemaFactory.createForClass(ConfigurationEntry);
