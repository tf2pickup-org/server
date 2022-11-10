import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import {
  BadRequestException,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { isNumber, isObject } from 'lodash';

type PlayerSkillType = { [gameClass in Tf2ClassName]?: number };

@Injectable()
export class ValidateSkillPipe implements PipeTransform {
  constructor(
    @Inject('QUEUE_CONFIG') private readonly queueConfig: QueueConfig,
  ) {}

  transform(value: unknown): PlayerSkillType {
    if (!isObject(value)) {
      throw new BadRequestException('player skill must be an object');
    }

    for (const gameClass of this.queueConfig.classes.map((gc) => gc.name)) {
      if (!(gameClass in value)) {
        throw new BadRequestException(`no skill for ${gameClass}`);
      }

      if (!isNumber(value[gameClass])) {
        throw new BadRequestException(`skill value must be a number`);
      }
    }

    return value;
  }
}
