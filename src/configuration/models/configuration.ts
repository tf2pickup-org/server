import { prop } from '@typegoose/typegoose';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class Configuration {

  @IsOptional()
  @IsNumber()
  @prop({ default: 1 })
  defaultPlayerSkill?: number;

  @IsOptional()
  @IsString()
  @prop()
  whitelistId?: string;

}
