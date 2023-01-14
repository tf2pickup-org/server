import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';
import { Exclude } from 'class-transformer';

@Schema()
export class ServemeTfConfiguration extends MongooseDocument {
  constructor() {
    super();
    this.key = 'serveme-tf';
  }

  @Exclude({ toPlainOnly: true })
  key: 'serveme-tf';

  @IsOptional()
  @IsString()
  @Prop()
  preferredRegion?: string;
}

export type ServemeTfConfigurationDocument = ServemeTfConfiguration & Document;
export const servemeTfConfigurationSchema = SchemaFactory.createForClass(
  ServemeTfConfiguration,
);
