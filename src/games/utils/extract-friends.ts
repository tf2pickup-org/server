import { QueueSlot } from '@/queue/queue-slot';

export function extractFriends(slots: QueueSlot[]): string[][] {
  return slots
    .filter(s => s.gameClass === 'medic')
    .filter(s => !!s.friend)
    .map(s => {
      const friend = slots.find(f => f.playerId === s.friend);
      if (!friend || friend.gameClass === 'medic') {
        return null;
      } else {
        return [ s.playerId, friend.playerId ];
      }
    })
    .filter(p => !!p);
}
