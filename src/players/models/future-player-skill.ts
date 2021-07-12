import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Imported skills for players that have not registered their account yet.
 */
@Schema()
export class FuturePlayerSkill {
  @Prop({ required: true, unique: true })
  steamId!: string;

  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  skill?: Map<Tf2ClassName, number>;
}

export type FuturePlayerSkillDocument = FuturePlayerSkill & Document;
export const futurePlayerSkillSchema =
  SchemaFactory.createForClass(FuturePlayerSkill);
