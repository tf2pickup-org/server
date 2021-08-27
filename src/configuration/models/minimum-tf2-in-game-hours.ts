import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Equals, IsNumber, Min } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class MinimumTf2InGameHours extends MongooseDocument {
  constructor(minimumTf2InGameHours = 500) {
    super();
    this.key = ConfigurationEntryKey.minimumTf2InGameHours;
    this.value = minimumTf2InGameHours;
  }

  @Equals(ConfigurationEntryKey.minimumTf2InGameHours)
  key: ConfigurationEntryKey.minimumTf2InGameHours;

  @IsNumber()
  @Min(0)
  @Prop()
  value: number;
}

export const minimumTf2InGameHoursSchema = SchemaFactory.createForClass(
  MinimumTf2InGameHours,
);
