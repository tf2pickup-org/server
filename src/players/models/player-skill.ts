import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Serializable } from '@/shared/serializable';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { PlayerSkillDto } from '../dto/player-skill.dto';

@Schema()
export class PlayerSkill extends Serializable<PlayerSkillDto> {
  @TransformObjectId()
  @Prop({ ref: 'Player', unique: true })
  player?: Types.ObjectId;

  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  skill?: Map<Tf2ClassName, number>;

  async serialize(): Promise<PlayerSkillDto> {
    return {
      player: this.player.toString(),
      skill: this.skill ? Object.fromEntries(this.skill) : {},
    };
  }
}

export type PlayerSkillDocument = PlayerSkill & Document;
export const playerSkillSchema = SchemaFactory.createForClass(PlayerSkill);
