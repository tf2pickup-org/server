import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Equals, IsBoolean } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class Etf2lAccountRequired extends MongooseDocument {
  constructor(etf2lAccountRequired = true) {
    super();
    this.key = ConfigurationEntryKey.etf2lAccountRequired;
    this.value = etf2lAccountRequired;
  }

  @Equals(ConfigurationEntryKey.etf2lAccountRequired)
  key: ConfigurationEntryKey.etf2lAccountRequired;

  @IsBoolean()
  @Prop()
  value: boolean;
}

export const etf2lAccountRequiredSchema =
  SchemaFactory.createForClass(Etf2lAccountRequired);
