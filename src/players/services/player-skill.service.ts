import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';

@Injectable()
export class PlayerSkillService {

  constructor(
    @InjectModel(PlayerSkill) private playerSkillModel: ReturnModelType<typeof PlayerSkill>,
  ) { }

  async getAll(): Promise<Array<DocumentType<PlayerSkill>>> {
    return await this.playerSkillModel.find({ });
  }

  async getPlayerSkill(playerId: string): Promise<DocumentType<PlayerSkill>> {
    const skill = await this.playerSkillModel.findOne({ player: playerId });
    return skill;
  }

  async setPlayerSkill(playerId: string, newSkill: { [gameClass: string]: number }): Promise<DocumentType<PlayerSkill>> {
    const skill = await this.playerSkillModel.findOne({ player: playerId });
    if (skill) {
      skill.skill = new Map(Object.entries(newSkill));
      skill.save();
      return skill;
    } else {
      return null;
    }
  }

}
