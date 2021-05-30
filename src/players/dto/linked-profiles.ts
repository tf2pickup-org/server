import { LinkedProfile } from '../types/linked-profile';

export class LinkedProfiles {
  constructor(playerId: string, linkedProfiles: LinkedProfile[]) {
    this.playerId = playerId;
    this.linkedProfiles = linkedProfiles;
  }

  playerId: string;
  linkedProfiles: LinkedProfile[];
}
