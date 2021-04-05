import { prop } from '@typegoose/typegoose';
import { IsOptional, IsString } from 'class-validator';

export class Map {
  @IsString()
  @prop({ required: true, unique: true })
  name!: string;

  @IsString()
  @IsOptional()
  @prop()
  execConfig?: string;

  // when the cooldown is 0, we're good to use this map again
  @prop({ default: 0 })
  cooldown?: number;
}
