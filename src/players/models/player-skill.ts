import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Serializable } from '@/shared/serializable';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlayerSkillDto } from '../dto/player-skill.dto';

@Schema()
export class PlayerSkill extends Serializable<PlayerSkillDto> {
  @Prop({ ref: 'Player', unique: true })
  player?: Types.ObjectId;

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
      skill: Object.fromEntries(this.skill),
    };
  }
}

export type PlayerSkillDocument = PlayerSkill & Document;
export const playerSkillSchema = SchemaFactory.createForClass(PlayerSkill);
