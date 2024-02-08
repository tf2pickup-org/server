import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { QueueSlot } from '../types/queue-slot';
import { QueueService } from './queue.service';
import { Events } from '@/events/events';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { PlayerAlreadyMarkedAsFriendError } from '../errors/player-already-marked-as-friend.error';
import { PlayerNotInTheQueueError } from '../errors/player-not-in-the-queue.error';
import { CannotMarkPlayerAsFriendError } from '../errors/cannot-mark-player-as-friend.error';
import { QueueState } from '../types/queue-state';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

const medicId = new Types.ObjectId() as PlayerId;
const dmClassId = new Types.ObjectId() as PlayerId;
const medic2Id = new Types.ObjectId() as PlayerId;

class QueueServiceStub {
  state = QueueState.waiting;
  slots: QueueSlot[] = [
    {
      id: 0,
      playerId: medicId,
      gameClass: Tf2ClassName.medic,
      ready: false,
      canMakeFriendsWith: [Tf2ClassName.soldier],
    },
    {
      id: 1,
      playerId: dmClassId,
      gameClass: Tf2ClassName.soldier,
      ready: false,
    },
    {
      id: 2,
      playerId: medic2Id,
      gameClass: Tf2ClassName.medic,
      ready: false,
      canMakeFriendsWith: [Tf2ClassName.soldier],
    },
  ];
  findSlotByPlayerId(playerId: PlayerId) {
    return this.slots.find((s) => s.playerId?.equals(playerId));
  }
}

describe('FriendsService', () => {
  let service: FriendsService;
  let queueService: QueueServiceStub;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: QueueService, useClass: QueueServiceStub },
        Events,
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    queueService = module.get(QueueService);
    events = module.get(Events);
  });

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markFriend()', () => {
    it('should fail if the queue is in launching state', () => {
      queueService.state = QueueState.launching;
      expect(() => service.markFriend(medicId, dmClassId)).toThrow(
        'cannot make friends at this stage',
      );
    });

    it('should fail if the medic is not in the queue', () => {
      queueService.slots = queueService.slots.filter(
        (s) => !s.playerId?.equals(medicId),
      );
      expect(() => service.markFriend(medicId, dmClassId)).toThrow(
        PlayerNotInTheQueueError,
      );
    });

    it('should fail if the friend is not in the queue', () => {
      queueService.slots = queueService.slots.filter(
        (s) => !s.playerId?.equals(dmClassId),
      );
      expect(() => service.markFriend(medicId, dmClassId)).toThrow(
        PlayerNotInTheQueueError,
      );
    });

    it('should fail the friend is also a medic', () => {
      queueService.slots[1].gameClass = Tf2ClassName.medic;
      expect(() => service.markFriend(medicId, dmClassId)).toThrow(
        CannotMarkPlayerAsFriendError,
      );
    });

    it('should fail if the target player is already marked as a friend', () => {
      service.markFriend(medic2Id, dmClassId);
      expect(() => service.markFriend(medicId, dmClassId)).toThrow(
        PlayerAlreadyMarkedAsFriendError,
      );
    });

    it('should mark friends', () => {
      const friendships = service.markFriend(medicId, dmClassId);
      expect(friendships).toEqual([
        { sourcePlayerId: medicId, targetPlayerId: dmClassId },
      ]);
    });

    it('should unmark friends', () => {
      service.markFriend(medicId, dmClassId);
      const friendships = service.markFriend(medicId, null);
      expect(friendships).toEqual([]);
    });

    it('should remove previous friendship', () => {
      const anotherPlayer = new Types.ObjectId() as PlayerId;
      queueService.slots.push({
        id: 2,
        playerId: anotherPlayer,
        gameClass: Tf2ClassName.soldier,
        ready: false,
      });
      service.markFriend(medicId, dmClassId);
      const friendships = service.markFriend(medicId, anotherPlayer);
      expect(friendships).toEqual([
        { sourcePlayerId: medicId, targetPlayerId: anotherPlayer },
      ]);
    });

    it('should emit the queueFriendshipsChange event', () =>
      new Promise<void>((resolve) => {
        events.queueFriendshipsChange.subscribe(({ friendships }) => {
          expect(friendships).toEqual([
            { sourcePlayerId: medicId, targetPlayerId: dmClassId },
          ]);
          resolve();
        });

        service.markFriend(medicId, dmClassId);
      }));
  });

  describe('onSlotsChange', () => {
    beforeEach(() => {
      service.markFriend(medicId, dmClassId);
    });

    it('should remove friendship if the medic leaves the queue', () => {
      queueService.slots = queueService.slots.filter(
        (s) => s.playerId !== medicId,
      );
      events.queueSlotsChange.next({ slots: queueService.slots });
      expect(service.friendships).toEqual([]);
    });

    it('should remove friendship if the medic changes class', () => {
      queueService.slots[0].gameClass = Tf2ClassName.soldier;
      events.queueSlotsChange.next({ slots: queueService.slots });
      expect(service.friendships).toEqual([]);
    });

    it('should not remove friendship if the friend leaves the queue', () => {
      queueService.slots = queueService.slots.filter(
        (s) => s.playerId !== dmClassId,
      );
      events.queueSlotsChange.next({ slots: queueService.slots });
      expect(service.friendships).toEqual([
        { sourcePlayerId: medicId, targetPlayerId: dmClassId },
      ]);
    });
  });
});
