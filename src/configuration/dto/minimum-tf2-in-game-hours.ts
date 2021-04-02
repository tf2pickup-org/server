import { Equals, IsNumber } from 'class-validator';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';

export class MinimumTf2InGameHours {

  constructor(value: number) {
    this.key = ConfigurationEntryKey.minimumTf2InGameHours;
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.minimumTf2InGameHours)
  key: string;

  @IsNumber()
  value: number;

}
