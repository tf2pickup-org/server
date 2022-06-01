import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Serializable } from '@/shared/serializable';
import { QueueSlotDto } from './queue-slot.dto';

export interface QueueDto {
  config: {
    teamCount: 2;
    classes: {
      name: Tf2ClassName;
      count: number;
      canMakeFriendsWith?: Tf2ClassName[];
    }[];
  };

  slots: Serializable<QueueSlotDto>[];

  // Queue state. Possible values:
  // waiting: not enough players
  // ready: players are expected to ready up
  // launching: the queue is full, a game is being launched
  state: 'waiting' | 'ready' | 'launching';

  mapVoteResults: {
    map: string;
    voteCount: number;
  }[];

  substituteRequests: {
    gameId: string;
    gameNumber: number;
    gameClass: Tf2ClassName;
    team: string;
  }[];

  friendships: {
    sourcePlayerId: string;
    targetPlayerId: string;
  }[];
}
