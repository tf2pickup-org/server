import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { PlayersService } from './players.service';
import { Console, Command, createSpinner } from 'nestjs-console';
import { writeFileSync } from 'fs';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import moment = require('moment');
import { FuturePlayerSkillService } from './future-player-skill.service';

@Injectable()
@Console()
export class PlayerSkillService implements OnModuleInit {

  constructor(
    @InjectModel(PlayerSkill) private playerSkillModel: ReturnModelType<typeof PlayerSkill>,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private futurePlayerSkillService: FuturePlayerSkillService,
  ) { }

  onModuleInit() {
    this.playersService.playerRegistered.subscribe(async playerId => {
      const player = await this.playersService.getById(playerId);
      const futureSkill = await this.futurePlayerSkillService.findSkill(player.steamId);
      if (futureSkill) {
        await this.setPlayerSkill(player.id, futureSkill.skill);
      }
    });
  }

  async getAll(): Promise<DocumentType<PlayerSkill>[]> {
    return await this.playerSkillModel.find({ });
  }

  async getPlayerSkill(playerId: string): Promise<DocumentType<PlayerSkill>> {
    return await this.playerSkillModel.findOne({ player: playerId });
  }

  async setPlayerSkill(playerId: string, newSkill: Map<string, number>): Promise<DocumentType<PlayerSkill>> {
    const skill = await this.playerSkillModel.findOne({ player: playerId });
    if (skill) {
      skill.skill = newSkill;
      return await skill.save();
    } else {
      const player = await this.playersService.getById(playerId);
      if (!player) {
        throw new Error('no such player');
      }

      return await this.playerSkillModel.create({
        player: player.id,
        skill: newSkill,
      });
    }
  }

  @Command({
    command: 'export-skills',
    description: 'Export skills of all players',
  })
  async exportPlayerSkills() {
    const spinner = createSpinner();
    spinner.start('Exporting player skills');

    // nick,etf2l_userid,scout,soldier,pyro,demoman,heavyweapons,engineer,medic,sniper,spy
    const gameClasses = this.queueConfigService.queueConfig.classes.map(c => c.name);
    const players = await this.playersService.getAll();
    const rows = [
      [ 'name', 'etf2lProfileId', ...gameClasses ].join(','),
      ...(await Promise.all(players.map(async p => {
        const skill = await this.getPlayerSkill(p.id);
        return skill ? [ p.name, p.etf2lProfileId, ...gameClasses.map(gc => skill.skill.get(gc)) ] : null;
      })))
      .filter(entry => !!entry)
      .map(row => row.join(',')),
    ];

    const fileName = `player-skills-${moment().format('YYYYMMDDHHmmss')}.csv`;
    writeFileSync(fileName, rows.join('\n'));
    spinner.succeed(`${fileName} saved.`);
  }

}
