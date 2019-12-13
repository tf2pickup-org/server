import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { GameClass } from '@/queue/game-class';

@Injectable()
export class PlayerSkillService {

  constructor(
    @InjectModel(PlayerSkill) private playerSkillModel: ReturnModelType<typeof PlayerSkill>,
    private queueConfigService: QueueConfigService,
  ) { }

  async getPlayerSkill(playerId: string): Promise<DocumentType<PlayerSkill>> {
    const skill = await this.playerSkillModel.findOne({ player: playerId });
    return skill ? skill : await this.initializeSkill(playerId, this.queueConfigService.queueConfig.classes);
  }

  private async initializeSkill(playerId: string, classes: GameClass[]): Promise<DocumentType<PlayerSkill>> {
    return await this.playerSkillModel.create({
      player: playerId,
      skill: classes.reduce((map, curr) => { map[curr.name] = 1; return map; }, { }),
    });
  }

}
