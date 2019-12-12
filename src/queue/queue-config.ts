import { GameClass } from './game-class';
import { Tf2Map } from './tf2-map';

export interface QueueConfig {
  /* This is always 2 */
  teamCount: 2;

  /* List of classes that play the given gamemode */
  classes: GameClass[];

  /* How much time does a player have to hit the ready up button */
  readyUpTimeout: number; // milliseconds

  /* How much time will the queue be in the ready up stage before going back to waiting stage if less than 12 players
    are ready */
  queueReadyTimeout: number; // milliseconds

  /* Map pool */
  maps: Tf2Map[];

  /* What configs to execute */
  // fixme make this per-map instead of per-gamemode
  execConfigs: string[];
}
