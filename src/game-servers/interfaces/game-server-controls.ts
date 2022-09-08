import { Rcon } from 'rcon-client/lib';

export interface GameServerControls {
  start: () => void | Promise<void>;
  rcon: () => Rcon | Promise<Rcon>;
  getLogsecret: () => string | Promise<string>;
}
