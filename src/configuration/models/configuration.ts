import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { RemoveVersionKeyAndId } from '@/utils/remove-version-key-and-id';
import { prop } from '@typegoose/typegoose';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class Configuration extends RemoveVersionKeyAndId {

  @IsOptional()
  @IsNumber({ }, { each: true })
  @Type(() => Number)
  @prop({ type: Number, default: new Map(Object.keys(Tf2ClassName).map(className => [className, 1])) })
  defaultPlayerSkill?: Map<string, number>;

  @IsOptional()
  @IsString()
  @prop()
  whitelistId?: string;

}
