export interface QueueSlot {
  id: number;
  gameClass: string;
  playerId: string | null;
  ready: boolean;
}
