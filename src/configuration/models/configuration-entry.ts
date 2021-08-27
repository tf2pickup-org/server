import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema({
  collection: 'configuration',
  discriminatorKey: 'key',
})
export class ConfigurationEntry {
  @Prop({ enum: ConfigurationEntryKey, unique: true })
  key: ConfigurationEntryKey;
}

export type ConfigurationEntryDocument = ConfigurationEntry & Document;
export const configurationEntrySchema =
  SchemaFactory.createForClass(ConfigurationEntry);
