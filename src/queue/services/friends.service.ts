import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { Events } from '@/events/events';

export interface Friendship {
  sourcePlayerId: string;
  targetPlayerId: string;
}

@Injectable()
export class FriendsService implements OnModuleInit {
  friendships: Friendship[] = [];

  constructor(private queueService: QueueService, private events: Events) {}

  onModuleInit() {
    this.events.queueSlotsChange.subscribe(() => this.cleanupFriendships());
  }

  markFriend(sourcePlayerId: string, targetPlayerId: string) {
    if (this.queueService.state === 'launching') {
      throw new Error('cannot make friends at this stage');
    }

    if (targetPlayerId === null) {
      // only removing frienship
      this.friendships = [
        ...this.friendships.filter((f) => f.sourcePlayerId !== sourcePlayerId),
      ];
    } else {
      const sourcePlayerSlot =
        this.queueService.findSlotByPlayerId(sourcePlayerId);
      const targetPlayerSlot =
        this.queueService.findSlotByPlayerId(targetPlayerId);
      if (!sourcePlayerSlot || !targetPlayerSlot) {
        throw new Error('player not in the queue');
      }

      if (sourcePlayerSlot.gameClass !== 'medic') {
        throw new Error('only medics can make friends');
      }

      if (targetPlayerSlot.gameClass === 'medic') {
        throw new Error('cannot make the other medic as a friend');
      }

      if (
        targetPlayerId !== null &&
        !!this.friendships.find((f) => f.targetPlayerId === targetPlayerId)
      ) {
        throw new Error(
          'this player is already marked as a friend by another player',
        );
      }

      this.friendships = [
        ...this.friendships.filter((f) => f.sourcePlayerId !== sourcePlayerId),
        { sourcePlayerId, targetPlayerId },
      ];
    }

    this.events.queueFriendshipsChange.next({ friendships: this.friendships });
    return this.friendships;
  }

  private cleanupFriendships() {
    this.friendships = this.friendships.filter(
      (f) =>
        this.queueService.findSlotByPlayerId(f.sourcePlayerId)?.gameClass ===
        'medic',
    );
    this.events.queueFriendshipsChange.next({ friendships: this.friendships });
  }
}
