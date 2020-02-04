import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueSlot } from '../queue-slot';
import { QueueGateway } from '../gateways/queue.gateway';

export interface Friendship {
  sourcePlayerId: string;
  targetPlayerId: string;
}

@Injectable()
export class FriendsService implements OnModuleInit {

  friendships: Friendship[] = [];

  constructor(
    private queueService: QueueService,
    @Inject(forwardRef(() => QueueGateway)) private queueGateway: QueueGateway,
  ) { }

  onModuleInit() {
    this.queueService.slotsChange.subscribe(slots => this.cleanupFriendships(slots));
  }

  markFriend(sourcePlayerId: string, targetPlayerId: string) {
    if (this.queueService.state === 'launching') {
      throw new Error('cannot make friends at this stage');
    }

    const sourcePlayerSlot = this.queueService.findSlotByPlayerId(sourcePlayerId);
    const targetPlayerSlot = this.queueService.findSlotByPlayerId(targetPlayerId);
    if (!sourcePlayerSlot || !targetPlayerSlot) {
      throw new Error('player not in the queue');
    }

    if (sourcePlayerSlot.gameClass !== 'medic') {
      throw new Error('only medics can make friends');
    }

    if (targetPlayerSlot.gameClass === 'medic') {
      throw new Error('cannot make the other medic as a friend');
    }

    this.friendships = [
      ...this.friendships.filter(f => f.sourcePlayerId !== sourcePlayerId),
      { sourcePlayerId, targetPlayerId },
    ];

    this.queueGateway.emitFriendshipsUpdate(this.friendships);
    return this.friendships;
  }

  private cleanupFriendships(slots: QueueSlot[]) {
    this.friendships = this.friendships.filter(f => this.queueService.findSlotByPlayerId(f.sourcePlayerId)?.gameClass === 'medic');
    this.queueGateway.emitFriendshipsUpdate(this.friendships);
  }

}
