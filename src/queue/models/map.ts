import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';

@Schema()
export class Map {
  @IsString()
  @Prop({ required: true, unique: true })
  name!: string;

  @IsString()
  @IsOptional()
  @Prop()
  execConfig?: string;

  // when the cooldown is 0, we're good to use this map again
  @Prop({ default: 0 })
  cooldown?: number;
}

export type MapDocument = Map & Document;
export const mapSchema = SchemaFactory.createForClass(Map);
