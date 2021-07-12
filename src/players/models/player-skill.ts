import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class PlayerSkill {
  @Prop({ ref: 'Player', unique: true })
  player?: Types.ObjectId;

  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  skill?: Map<Tf2ClassName, number>;
}

export type PlayerSkillDocument = PlayerSkill & Document;
export const playerSkillSchema = SchemaFactory.createForClass(PlayerSkill);
