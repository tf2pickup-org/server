import { Injectable, OnModuleInit } from '@nestjs/common';
import { PlayerSkill, PlayerSkillDocument } from '../models/player-skill';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { Events } from '@/events/events';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

export type PlayerSkillType = PlayerSkill['skill'];

@Injectable()
export class PlayerSkillService implements OnModuleInit {
  constructor(
    @InjectModel(PlayerSkill.name)
    private playerSkillModel: Model<PlayerSkillDocument>,
    private futurePlayerSkillService: FuturePlayerSkillService,
    private events: Events,
  ) {}

  onModuleInit() {
    this.events.playerRegisters.subscribe(async ({ player }) => {
      const futureSkill = await this.futurePlayerSkillService.findSkill(
        player.steamId,
      );
      if (futureSkill) {
        await this.setPlayerSkill(player.id, futureSkill.skill);
      }
    });
  }

  async getAll(): Promise<PlayerSkill[]> {
    return await this.playerSkillModel.find({});
  }

  async getPlayerSkill(playerId: string): Promise<PlayerSkillType> {
    return (await this.playerSkillModel.findOne({ player: playerId }))?.skill;
  }

  async setPlayerSkill(
    playerId: string,
    skill: PlayerSkillType,
    adminId?: string,
  ): Promise<PlayerSkillType> {
    const oldSkill =
      (
        await this.playerSkillModel.findOne({
          player: new Types.ObjectId(playerId),
        })
      )?.skill || new Map();
    const newSkill = (
      await this.playerSkillModel.findOneAndUpdate(
        { player: playerId },
        { skill },
        { new: true, upsert: true },
      )
    ).skill;
    this.events.playerSkillChanged.next({
      playerId,
      oldSkill,
      newSkill,
      adminId,
    });
    return newSkill;
  }
}
