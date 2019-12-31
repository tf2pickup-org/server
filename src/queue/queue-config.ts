import { GameClass } from './game-class';
import { Tf2Map } from './tf2-map';

export interface QueueConfig {
  /* This is always 2 */
  teamCount: 2;

  /* List of classes that play the given gamemode */
  classes: GameClass[];

  /* Map pool */
  maps: Tf2Map[];

  /* What configs to execute */
  // fixme make this per-map instead of per-gamemode
  execConfigs: string[];
}
