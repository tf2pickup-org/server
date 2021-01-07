import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface PlayerStats {
  player: string;
  gamesPlayed: number;
  classesPlayed: { [className in Tf2ClassName]?: number };
}
