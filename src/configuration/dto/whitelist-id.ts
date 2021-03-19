import { Equals, IsString } from 'class-validator';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';

export class WhitelistId {

  constructor(value: string) {
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.whitelistId)
  key: string;

  @IsString()
  value: string;

}
