import { QueueConfigService } from '@/queue-config/services/queue-config.service';
import { Injectable } from '@nestjs/common';
import { PlayerSkillRecordMalformedError } from '../errors/player-skill-record-malformed.error';
import { FuturePlayerSkillService } from './future-player-skill.service';

@Injectable()
export class ImportExportSkillService {
  private readonly expectedRecordLength =
    this.queueConfigService.queueConfig.classes.length + 1;

  constructor(
    private readonly futurePlayerSkillService: FuturePlayerSkillService,
    private readonly queueConfigService: QueueConfigService,
  ) {}

  async importRawSkillRecord(record: string[]) {
    if (record.length !== this.expectedRecordLength) {
      throw new PlayerSkillRecordMalformedError(this.expectedRecordLength);
    }

    const steamId64 = record[0];
    const skills = new Map(
      this.queueConfigService.queueConfig.classes
        .map((gameClass) => gameClass.name)
        .map((name, i) => [name, parseInt(record[i + 1], 10)]),
    );
    await this.futurePlayerSkillService.registerSkill(steamId64, skills);
  }
}
