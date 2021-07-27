import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';
import { Exclude, Expose } from 'class-transformer';
import { IsLocale, IsOptional, IsString } from 'class-validator';

@Exclude()
// @index({ name: 1, language: 1 }, { unique: true })
@Schema()
export class Document {
  @IsString()
  @Expose()
  @Prop({ required: true })
  name: string;

  @IsLocale()
  @Expose()
  @Prop({ required: true })
  language: string;

  @IsOptional()
  @IsString()
  @Expose()
  @Prop()
  body?: string;
}

export type DocumentDocument = Document & MongooseDocument;
export const documentSchema = SchemaFactory.createForClass(Document);
