import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { PlayersService } from './players.service';
import { Console, Command, createSpinner } from 'nestjs-console';
import { writeFileSync, createReadStream } from 'fs';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import moment = require('moment');
import { FuturePlayerSkillService } from './future-player-skill.service';
import { createInterface } from 'readline';
import { Etf2lProfileService } from './etf2l-profile.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';

@Injectable()
@Console()
export class PlayerSkillService implements OnModuleInit {

  constructor(
    @InjectModel(PlayerSkill) private playerSkillModel: ReturnModelType<typeof PlayerSkill>,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
    private futurePlayerSkillService: FuturePlayerSkillService,
    private etf2lProfileService: Etf2lProfileService,
    private discordNotificationsService: DiscordNotificationsService,
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
      this.discordNotificationsService.notifySkillChange(playerId, skill.skill, newSkill);
      skill.skill = newSkill;
      return await skill.save();
    } else {
      const player = await this.playersService.getById(playerId);
      if (!player) {
        throw new Error('no such player');
      }

      this.discordNotificationsService.notifySkillChange(playerId, new Map([]), newSkill);

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

    // etf2l_profileid,scout,soldier,pyro,demoman,heavyweapons,engineer,medic,sniper,spy
    const gameClasses = this.queueConfigService.queueConfig.classes.map(c => c.name);
    const players = await this.playersService.getAll();
    const rows = [
      [ 'etf2lProfileId', ...gameClasses ].join(','),
      ...(await Promise.all(players.map(async p => {
        const skill = await this.getPlayerSkill(p.id);
        return skill ? [ p.etf2lProfileId, ...gameClasses.map(gc => skill.skill.get(gc)) ] : null;
      })))
      .filter(entry => !!entry)
      .map(row => row.join(',')),
    ];

    const fileName = `player-skills-${moment().format('YYYYMMDDHHmmss')}.csv`;
    writeFileSync(fileName, rows.join('\n'));
    spinner.succeed(`${fileName} saved.`);
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
      const [ etf2lProfileId, ...rawSkill ] = line.split(/;|,/);

      const skill = new Map(
        this.queueConfigService.queueConfig.classes
          .map((c, index) => [ c.name, parseInt(rawSkill[index], 10) ])
      );

      try {
        const player = await this.playersService.findByEtf2lProfileId(parseInt(etf2lProfileId, 10));
        if (player) {
          await this.setPlayerSkill(player.id, skill);
        } else {
          const etf2lProfile = await this.etf2lProfileService.fetchPlayerInfo(etf2lProfileId);
          await this.futurePlayerSkillService.registerSkill(etf2lProfile.steam.id64, skill);
        }
        i += 1;
      } catch (e) {
        spinner.warn(`Failed to parse line "${line}": ${e}`);
      }
    }

    spinner.succeed(`Imported skills for ${i} players.`);
  }

}
