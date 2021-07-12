import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { PlayerSkill, PlayerSkillDocument } from '../models/player-skill';
import { PlayersService } from './players.service';
import { Console, Command, createSpinner } from 'nestjs-console';
import { createReadStream } from 'fs';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { createInterface } from 'readline';
import { Etf2lProfileService } from './etf2l-profile.service';
import { Events } from '@/events/events';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export type PlayerSkillType = PlayerSkill['skill'];

@Injectable()
@Console()
export class PlayerSkillService implements OnModuleInit {
  constructor(
    @InjectModel(PlayerSkill.name)
    private playerSkillModel: Model<PlayerSkillDocument>,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private futurePlayerSkillService: FuturePlayerSkillService,
    private etf2lProfileService: Etf2lProfileService,
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
      (await this.playerSkillModel.findOne({ player: playerId }))?.skill ||
      new Map();
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

  @Command({
    command: 'import-skills <fileName>',
    description: 'Import skills of all players',
  })
  async importPlayerSkills(inputFileName: string) {
    const spinner = createSpinner();

    if (!inputFileName?.length) {
      spinner.fail('An input file name is required.');
      return;
    }

    spinner.start('Import player skills');

    const fileStream = createReadStream(inputFileName);
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let i = 0;

    for await (const line of rl) {
      const [etf2lProfileId, ...rawSkill] = line.split(/;|,/);

      const skill = new Map(
        this.queueConfigService.queueConfig.classes.map((c, index) => [
          c.name,
          parseInt(rawSkill[index], 10),
        ]),
      );

      try {
        const player = await this.playersService.findByEtf2lProfileId(
          parseInt(etf2lProfileId, 10),
        );
        if (player) {
          await this.setPlayerSkill(player.id, skill);
        } else {
          const etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(
            etf2lProfileId,
          );
          await this.futurePlayerSkillService.registerSkill(
            etf2lProfile.steam.id64,
            skill,
          );
        }
        i += 1;
      } catch (e) {
        spinner.warn(`Failed to parse line "${line}": ${e}`);
      }
    }

    spinner.succeed(`Imported skills for ${i} players.`);
  }
}
