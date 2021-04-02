import { Equals, IsBoolean } from 'class-validator';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';

export class Etf2lAccountRequired {

  constructor(value: boolean) {
    this.key = ConfigurationEntryKey.etf2lAccountRequired;
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.etf2lAccountRequired)
  key: string;

  @IsBoolean()
  value: boolean;

}
