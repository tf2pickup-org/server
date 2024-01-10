import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FuturePlayerSkill } from '../models/future-player-skill';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { InjectModel } from '@nestjs/mongoose';
import { Error, Model } from 'mongoose';
import { Player } from '../models/player';
import { Events } from '@/events/events';
import { PlayersService } from './players.service';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class FuturePlayerSkillService implements OnModuleInit {
  private logger = new Logger(FuturePlayerSkillService.name);

  constructor(
    @InjectModel(FuturePlayerSkill.name)
    private futurePlayerSkillModel: Model<FuturePlayerSkill>,
    private events: Events,
    private playersService: PlayersService,
  ) {}

  onModuleInit() {
    this.events.playerRegisters.subscribe(
      async ({ player }) => await this.maybeSetSkill(player),
    );
  }

  async registerSkill(
    steamId: string,
    skill: Map<Tf2ClassName, number>,
  ): Promise<FuturePlayerSkill> {
    return plainToInstance(
      FuturePlayerSkill,
      await this.futurePlayerSkillModel
        .findOneAndUpdate({ steamId }, { skill }, { new: true, upsert: true })
        .lean()
        .exec(),
    );
  }

  async findSkill(steamId: string): Promise<FuturePlayerSkill> {
    return plainToInstance(
      FuturePlayerSkill,
      await this.futurePlayerSkillModel
        .findOne({ steamId })
        .orFail()
        .lean()
        .exec(),
    );
  }

  private async maybeSetSkill(player: Player) {
    try {
      const futureSkill = await this.findSkill(player.steamId);
      await this.playersService.updatePlayer(player._id, {
        $set: {
          skill: futureSkill.skill,
        },
      });
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        this.logger.verbose(`no future skill for ${player.name}`);
      } else {
        throw error;
      }
    }
  }
}
