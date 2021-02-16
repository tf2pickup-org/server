import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { prop } from '@typegoose/typegoose';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class Configuration {

  @IsOptional()
  @IsNumber({ }, { each: true })
  @prop({ type: Number, default: new Map(Object.keys(Tf2ClassName).map(className => [className, 1])) })
  defaultPlayerSkill?: Map<Tf2ClassName, number>;

  @IsOptional()
  @IsString()
  @prop()
  whitelistId?: string;

}
