import { GameClass } from './game-class';

export interface QueueConfig {
  /* This is always 2 */
  teamCount: 2;

  /* List of classes that play the given gamemode */
  classes: GameClass[];

  /* Whitelist ID (http://whitelist.tf/) */
  whitelistId: string;
}
