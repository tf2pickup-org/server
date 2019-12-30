import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { PlayersService } from './players.service';

@Injectable()
export class PlayerSkillService {

  constructor(
    @InjectModel(PlayerSkill) private playerSkillModel: ReturnModelType<typeof PlayerSkill>,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
  ) { }

  async getAll(): Promise<Array<DocumentType<PlayerSkill>>> {
    return await this.playerSkillModel.find({ });
  }

  async getPlayerSkill(playerId: string): Promise<DocumentType<PlayerSkill>> {
    return await this.playerSkillModel.findOne({ player: playerId });
  }

  async setPlayerSkill(playerId: string, newSkill: { [gameClass: string]: number }): Promise<DocumentType<PlayerSkill>> {
    const skill = await this.playerSkillModel.findOne({ player: playerId });
    if (skill) {
      skill.skill = new Map(Object.entries(newSkill));
      return await skill.save();
    } else {
      const player = await this.playersService.getById(playerId);
      if (!player) {
        throw new Error('no such player');
      }

      return await this.playerSkillModel.create({
        player,
        skill: new Map(Object.entries(newSkill)),
      });
    }
  }

}
