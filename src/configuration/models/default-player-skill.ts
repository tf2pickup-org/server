import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Equals, IsNumber } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class DefaultPlayerSkill extends MongooseDocument {
  constructor() {
    super();
    this.key = ConfigurationEntryKey.defaultPlayerSkill;
    this.value = new Map(
      (Object.keys(Tf2ClassName) as Tf2ClassName[]).map((className) => [
        className,
        1,
      ]),
    );
  }

  @Equals(ConfigurationEntryKey.defaultPlayerSkill)
  key: ConfigurationEntryKey.defaultPlayerSkill;

  @IsNumber({}, { each: true })
  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  value: Map<Tf2ClassName, number>;
}

export const defaultPlayerSkillSchema =
  SchemaFactory.createForClass(DefaultPlayerSkill);
