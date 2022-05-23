import { PlayerDto } from '@/players/dto/player.dto';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface GameDto {
  id: string;
  launchedAt: Date;
  endedAt?: Date;
  number: number;
  slots: {
    player: PlayerDto;
    team: 'red' | 'blu';
    gameClass: Tf2ClassName;
    status: 'active' | 'waiting for substitute' | 'replaced';
    connectionStatus: 'offline' | 'joining' | 'connected';
  }[];
  map: string;
  state: 'launching' | 'started' | 'ended' | 'interrupted';
  connectInfoVersion: number;
  stvConnectString?: string;
  logsUrl?: string;
  demoUrl?: string;
  error?: string;
  gameServer?: any;
  score: {
    blu?: number;
    red?: number;
  };
}
