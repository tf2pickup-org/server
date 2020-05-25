import { ObjectId } from 'mongodb';

export interface QueueSlot {
  id: number;
  gameClass: string;
  playerId: ObjectId | null;
  ready: boolean;
}
