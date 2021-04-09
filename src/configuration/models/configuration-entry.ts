import { prop } from '@typegoose/typegoose';
import { ConfigurationEntryKey } from './configuration-entry-key';

export class ConfigurationEntry {
  @prop({ enum: ConfigurationEntryKey, unique: true })
  key: ConfigurationEntryKey;

  @prop()
  value: string;
}
