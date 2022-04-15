import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Equals, IsEnum, IsString } from 'class-validator';
import { ServemeTfApiEndpoint } from './serveme-tf-endpoint';
import { Document } from 'mongoose';

@Schema()
export class ServemeTfConfiguration extends MongooseDocument {
  constructor() {
    super();
    this.key = 'serveme-tf';
  }

  @Equals('serveme-tf')
  key: 'serveme-tf';

  @IsEnum(ServemeTfApiEndpoint)
  @Prop({ enum: ServemeTfApiEndpoint, default: ServemeTfApiEndpoint.servemeTf })
  apiEndpointUrl: ServemeTfApiEndpoint;

  @IsString()
  @Prop()
  preferredRegion: string;
}

export type ServemeTfConfigurationDocument = ServemeTfConfiguration & Document;
export const servemeTfConfigurationSchema = SchemaFactory.createForClass(
  ServemeTfConfiguration,
);
