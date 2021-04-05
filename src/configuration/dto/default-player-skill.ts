import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Type } from 'class-transformer';
import { Equals, IsNumber } from 'class-validator';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';

export class DefaultPlayerSkill {
  constructor(value: Map<Tf2ClassName, number>) {
    this.key = ConfigurationEntryKey.defaultPlayerSkill;
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.defaultPlayerSkill)
  key: string;

  @IsNumber({}, { each: true })
  @Type(() => Number)
  value: Map<Tf2ClassName, number>;
}
