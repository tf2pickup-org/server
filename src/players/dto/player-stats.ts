import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Type } from 'class-transformer';

interface PlayerStatsParams {
  player: string;
  gamesPlayed: number;
  classesPlayed: Map<Tf2ClassName, number>;
}

export class PlayerStats {

  constructor(params: PlayerStatsParams) {
    this.player = params.player;
    this.gamesPlayed = params.gamesPlayed;
    this.classesPlayed = params.classesPlayed;
  }

  player: string;
  gamesPlayed: number;

  @Type(() => Number)
  classesPlayed: Map<Tf2ClassName, number>;
}
