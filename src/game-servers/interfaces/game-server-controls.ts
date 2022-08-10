import { Rcon } from 'rcon-client/lib';

export interface GameServerControls {
  start: () => Promise<void>;
  rcon: () => Promise<Rcon>;
  getLogsecret: () => Promise<string>;
}
