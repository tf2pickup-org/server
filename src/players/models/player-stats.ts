export interface PlayerStats {
  player: string;
  gamesPlayed: number;
  classesPlayed: { [gameClass: string]: number };
}
