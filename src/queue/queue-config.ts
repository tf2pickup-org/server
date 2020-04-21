import { GameClass } from './game-class';

export interface QueueConfig {
  /* This is always 2 */
  teamCount: 2;

  /* List of classes that play the given gamemode */
  classes: GameClass[];

  /* Map pool */
  maps: string[];

  /* What configs to execute */
  // fixme make this per-map instead of per-gamemode
  execConfigs: string[];

  /* Whitelist ID (http://whitelist.tf/) */
  whitelistId: string;
}
