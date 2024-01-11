import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Expose } from 'class-transformer';
import { IsLocale, IsOptional, IsString } from 'class-validator';

@Exclude()
@Schema()
export class Document {
  @IsString()
  @Expose()
  @Prop({ required: true })
  name!: string;

  @IsLocale()
  @Expose()
  @Prop({ required: true })
  language!: string;

  @IsOptional()
  @IsString()
  @Expose()
  @Prop()
  body?: string;
}

export const documentSchema = SchemaFactory.createForClass(Document);
