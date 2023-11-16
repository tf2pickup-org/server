import { Serializable } from '@/shared/serializable';
import { GameSlotDto } from './game-slot-dto';
import { GameState } from '../models/game-state';

export interface GameDto {
  id: string;
  launchedAt: string;
  endedAt?: string;
  number: number;
  map: string;
  state: GameState;
  connectInfoVersion: number;
  stvConnectString?: string;
  logsUrl?: string;
  demoUrl?: string;
  error?: string;
  gameServer?: {
    name: string;
  };
  score?: {
    blu?: number;
    red?: number;
  };

  // TODO v12: remove
  slots: Serializable<GameSlotDto>[];
}
