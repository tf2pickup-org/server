import { index, prop } from '@typegoose/typegoose';
import { Exclude, Expose } from 'class-transformer';
import { IsLocale, IsOptional, IsString } from 'class-validator';

@Exclude()
@index({ name: 1, language: 1 }, { unique: true })
export class Document {

  @IsString()
  @Expose()
  @prop({ required: true })
  name: string;

  @IsLocale()
  @Expose()
  @prop({ required: true })
  language: string;

  @IsOptional()
  @IsString()
  @Expose()
  @prop()
  body?: string;

}
