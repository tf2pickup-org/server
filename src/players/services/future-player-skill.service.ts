import { Injectable } from '@nestjs/common';
import { FuturePlayerSkill } from '../models/future-player-skill';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

@Injectable()
export class FuturePlayerSkillService {

  constructor(
    @InjectModel(FuturePlayerSkill) private futurePlayerSkillModel: ReturnModelType<typeof FuturePlayerSkill>,
  ) { }

  async registerSkill(steamId: string, skill: Map<Tf2ClassName, number>) {
    return await this.futurePlayerSkillModel.findOneAndUpdate({ steamId }, { skill }, { new: true, upsert: true });
  }

  async findSkill(steamId: string) {
    return await this.futurePlayerSkillModel.findOne({ steamId });
  }

}
