import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document } from 'mongoose';

/**
 * Imported skills for players that have not registered their account yet.
 */
@Schema()
export class FuturePlayerSkill extends MongooseDocument {
  @Prop({ required: true, unique: true })
  steamId!: string;

  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  skill!: Map<Tf2ClassName, number>;
}

export type FuturePlayerSkillDocument = FuturePlayerSkill & Document;
export const futurePlayerSkillSchema =
  SchemaFactory.createForClass(FuturePlayerSkill);
