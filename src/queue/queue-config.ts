import { GameClass } from './game-class';
import { MapPoolItem } from './map-pool-item';

export interface QueueConfig {
  /* This is always 2 */
  teamCount: 2;

  /* List of classes that play the given gamemode */
  classes: GameClass[];

  /* Map pool */
  maps: MapPoolItem[];

  /* Configs */
  configs: { [configName: string]: string };

  /* List of configs to execute */
  execConfigs?: string[];

  /* Whitelist ID (http://whitelist.tf/) */
  whitelistId: string;
}
