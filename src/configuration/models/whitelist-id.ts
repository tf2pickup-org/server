import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Equals, IsString } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class WhitelistId extends MongooseDocument {
  constructor(value = 'etf2l_6v6') {
    super();
    this.key = ConfigurationEntryKey.whitelistId;
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.whitelistId)
  key: ConfigurationEntryKey.whitelistId;

  @IsString()
  @Prop()
  value: string;
}

export const whitelistIdSchema = SchemaFactory.createForClass(WhitelistId);
