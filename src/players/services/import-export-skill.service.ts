import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { Inject, Injectable } from '@nestjs/common';
import { PlayerSkillRecordMalformedError } from '../errors/player-skill-record-malformed.error';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { QUEUE_CONFIG } from '@/queue-config/queue-config.token';

@Injectable()
export class ImportExportSkillService {
  private readonly expectedRecordLength = this.queueConfig.classes.length + 1;

  constructor(
    private readonly futurePlayerSkillService: FuturePlayerSkillService,
    @Inject(QUEUE_CONFIG) private readonly queueConfig: QueueConfig,
  ) {}

  async importRawSkillRecord(record: string[]) {
    if (record.length !== this.expectedRecordLength) {
      throw new PlayerSkillRecordMalformedError(this.expectedRecordLength);
    }

    const steamId64 = record[0];
    const skills = new Map(
      this.queueConfig.classes
        .map((gameClass) => gameClass.name)
        .map((name, i) => [name, parseInt(record[i + 1], 10)]),
    );
    await this.futurePlayerSkillService.registerSkill(steamId64, skills);
  }
}
