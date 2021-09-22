import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiKeyPurpose } from '../api-key-purpose';

@Schema()
export class ApiKey {
  @Prop({ required: true, unique: true, enum: ApiKeyPurpose })
  purpose: ApiKeyPurpose;

  @Prop({ required: true })
  apiKey: string;
}

export type ApiKeyDocument = ApiKey & Document;
export const apiKeySchema = SchemaFactory.createForClass(ApiKey);
