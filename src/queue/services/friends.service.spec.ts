import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { QueueSlot } from '../queue-slot';
import { QueueService } from './queue.service';
import { Events } from '@/events';

class QueueServiceStub {
  state = 'waiting';
  slots: QueueSlot[] = [
    { id: 0, playerId: 'FAKE_MEDIC', gameClass: 'medic', ready: false },
    { id: 1, playerId: 'FAKE_DM_CLASS', gameClass: 'soldier', ready: false },
    { id: 2, playerId: 'FAKE_2ND_MEDIC', gameClass: 'medic', ready: false },
  ];
  findSlotByPlayerId(playerId: string) { return this.slots.find(s => s.playerId === playerId); }
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
      queueService.state = 'launching';
      expect(() => service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS')).toThrowError('cannot make friends at this stage');
    });

    it('should fail if the medic is not in the queue', () => {
      queueService.slots = queueService.slots.filter(s => s.playerId !== 'FAKE_MEDIC');
      expect(() => service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS')).toThrowError('player not in the queue');
    });

    it('should fail if the friend is not in the queue', () => {
      queueService.slots = queueService.slots.filter(s => s.playerId !== 'FAKE_DM_CLASS');
      expect(() => service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS')).toThrowError('player not in the queue');
    });

    it('should fail if the medic is not a medic after all', () => {
      queueService.slots[0].gameClass = 'scout';
      expect(() => service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS')).toThrowError('only medics can make friends');
    });

    it('should fail the friend is also a medic', () => {
      queueService.slots[1].gameClass = 'medic';
      expect(() => service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS')).toThrowError('cannot make the other medic as a friend');
    });

    it('should fail if the target player is already marked as a friend', () => {
      service.markFriend('FAKE_2ND_MEDIC', 'FAKE_DM_CLASS');
      expect(() => service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS')).toThrowError('this player is already marked as a friend by another player');
    });

    it('should mark friends', () => {
      const friendships = service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS');
      expect(friendships).toEqual([{ sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' }]);
    });

    it('should unmark friends', () => {
      service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS');
      const friendships = service.markFriend('FAKE_MEDIC', null);
      expect(friendships).toEqual([]);
    });

    it('should remove previous frienship', () => {
      queueService.slots.push({ id: 2, playerId: 'ANOTHER_PLAYER', gameClass: 'soldier', ready: false });
      service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS');
      const friendships = service.markFriend('FAKE_MEDIC', 'ANOTHER_PLAYER');
      expect(friendships).toEqual([{ sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'ANOTHER_PLAYER' }]);
    });

    it('should emit the queueFriendshipsChange event', async () => new Promise(resolve => {
      events.queueFriendshipsChange.subscribe(({ friendships }) => {
        expect(friendships).toEqual([{ sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' }]);
        resolve();
      });

      service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS');
    }));
  });

  describe('onSlotsChange', () => {
    beforeEach(() => {
      service.markFriend('FAKE_MEDIC', 'FAKE_DM_CLASS');
    });

    it('should remove frienship if the medic leaves the queue', () => {
      queueService.slots = queueService.slots.filter(s => s.playerId !== 'FAKE_MEDIC');
      events.queueSlotsChange.next({ slots: queueService.slots });
      expect(service.friendships).toEqual([]);
    });

    it('should remove friendship if the medic changes class', () => {
      queueService.slots[0].gameClass = 'soldier';
      events.queueSlotsChange.next({ slots: queueService.slots });
      expect(service.friendships).toEqual([]);
    });

    it('should not remove frienship if the friend leaves the queue', () => {
      queueService.slots = queueService.slots.filter(s => s.playerId !== 'FAKE_DM_CLASS');
      events.queueSlotsChange.next({ slots: queueService.slots });
      expect(service.friendships).toEqual([{ sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' }]);
    });
  });
});
