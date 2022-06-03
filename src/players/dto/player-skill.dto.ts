import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface PlayerSkillDto {
  player: string;
  skill: { [gameClass in Tf2ClassName]?: number };
}
