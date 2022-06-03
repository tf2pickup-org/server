import { Serializable } from '@/shared/serializable';
import { QueueDto } from '../dto/queue.dto';
import { MapVoteResult } from '../map-vote-result';
import { QueueConfig } from '../queue-config';
import { QueueSlot } from '../queue-slot';
import { QueueState } from '../queue-state';
import { Friendship } from '../services/friends.service';
import { SubstituteRequest } from '../substitute-request';
import { QueueSlotWrapper } from './queue-slot-wrapper';

interface QueueWrapperParams {
  config: QueueConfig;
  slots: QueueSlot[];
  state: QueueState;
  mapVoteResults: MapVoteResult[];
  substituteRequests: SubstituteRequest[];
  friendships: Friendship[];
}

export class QueueWrapper extends Serializable<QueueDto> {
  public readonly config: QueueConfig;
  public readonly slots: QueueSlot[];
  public readonly state: QueueState;
  public readonly mapVoteResults: MapVoteResult[];
  public readonly substituteRequests: SubstituteRequest[];
  public readonly friendships: Friendship[];

  constructor(params: QueueWrapperParams) {
    super();
    this.config = params.config;
    this.slots = params.slots;
    this.state = params.state;
    this.mapVoteResults = params.mapVoteResults;
    this.substituteRequests = params.substituteRequests;
    this.friendships = params.friendships;
  }

  async serialize(): Promise<QueueDto> {
    return {
      config: this.config,
      slots: this.slots.map((s) => new QueueSlotWrapper(s)),
      state: this.state,
      mapVoteResults: this.mapVoteResults,
      substituteRequests: this.substituteRequests,
      friendships: this.friendships,
    };
  }
}
