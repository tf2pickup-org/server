import { Injectable } from '@nestjs/common';
import {
  FuturePlayerSkill,
  FuturePlayerSkillDocument,
} from '../models/future-player-skill';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class FuturePlayerSkillService {
  constructor(
    @InjectModel(FuturePlayerSkill.name)
    private futurePlayerSkillModel: Model<FuturePlayerSkillDocument>,
  ) {}

  async registerSkill(steamId: string, skill: Map<Tf2ClassName, number>) {
    return await this.futurePlayerSkillModel.findOneAndUpdate(
      { steamId },
      { skill },
      { new: true, upsert: true },
    );
  }

  async findSkill(steamId: string) {
    return await this.futurePlayerSkillModel.findOne({ steamId });
  }
}
