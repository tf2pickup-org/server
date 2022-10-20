import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { PlayerDto } from './player.dto';

export interface PlayerSkillDto extends PlayerDto {
  skill: { [gameClass in Tf2ClassName]?: number };
}
