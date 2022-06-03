import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface PlayerStatsDto {
  player: string;
  gamesPlayed: number;
  classesPlayed: { [gameClass in Tf2ClassName]?: number };
}
