import { GameClass } from './game-class';

export interface QueueConfig {
  // This is always 2
  teamCount: 2;

  // List of classes that play the given gamemode
  classes: GameClass[];

  // Time players have to ready up before they are kicked out of the queue [ms]
  readyUpTimeout: number;

  // Time the queue stays in ready-up state before going back to the 'waiting' state,
  // unless all players ready up [ms]
  readyStateTimeout: number;

  // How many times the last played map cannot be an option to vote for
  mapCooldown: number;
}
