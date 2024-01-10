import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { Events } from '@/events/events';
import { PlayerNotInTheQueueError } from '../errors/player-not-in-the-queue.error';
import { CannotMarkPlayerAsFriendError } from '../errors/cannot-mark-player-as-friend.error';
import { PlayerAlreadyMarkedAsFriendError } from '../errors/player-already-marked-as-friend.error';
import { QueueState } from '../queue-state';
import { PlayerId } from '@/players/types/player-id';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface Friendship {
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
}

@Injectable()
export class FriendsService implements OnModuleInit {
  friendships: Friendship[] = [];

  constructor(
    private queueService: QueueService,
    private events: Events,
  ) {}

  onModuleInit() {
    this.events.queueSlotsChange.subscribe(() => this.cleanupFriendships());
  }

  markFriend(sourcePlayerId: PlayerId, targetPlayerId: PlayerId | null) {
    if (this.queueService.state === QueueState.launching) {
      throw new Error('cannot make friends at this stage');
    }

    if (targetPlayerId === null) {
      // only removing friendship
      this.friendships = [
        ...this.friendships.filter(
          (f) => !f.sourcePlayerId.equals(sourcePlayerId),
        ),
      ];
    } else {
      const sourcePlayerSlot =
        this.queueService.findSlotByPlayerId(sourcePlayerId);
      if (!sourcePlayerSlot) {
        throw new PlayerNotInTheQueueError(sourcePlayerId);
      }

      const targetPlayerSlot =
        this.queueService.findSlotByPlayerId(targetPlayerId);
      if (!targetPlayerSlot) {
        throw new PlayerNotInTheQueueError(targetPlayerId);
      }

      if (
        !sourcePlayerSlot.canMakeFriendsWith?.includes(
          targetPlayerSlot.gameClass,
        )
      ) {
        throw new CannotMarkPlayerAsFriendError(
          sourcePlayerId,
          sourcePlayerSlot.gameClass,
          targetPlayerId,
          targetPlayerSlot.gameClass,
        );
      }

      if (
        this.friendships.find((f) => f.targetPlayerId.equals(targetPlayerId))
      ) {
        throw new PlayerAlreadyMarkedAsFriendError(targetPlayerId);
      }

      this.friendships = [
        ...this.friendships.filter(
          (f) => !f.sourcePlayerId.equals(sourcePlayerId),
        ),
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
        Tf2ClassName.medic,
    );
    this.events.queueFriendshipsChange.next({ friendships: this.friendships });
  }
}
