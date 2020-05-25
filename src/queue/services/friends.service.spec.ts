import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { Subject } from 'rxjs';
import { QueueSlot } from '../queue-slot';
import { QueueService } from './queue.service';
import { QueueGateway } from '../gateways/queue.gateway';
import { ObjectId } from 'mongodb';

jest.mock('../gateways/queue.gateway.ts');

class QueueServiceStub {
  _medicId = new ObjectId();
  _scoutId = new ObjectId();
  _2ndMedicId = new ObjectId();

  slotsChange = new Subject<QueueSlot[]>();
  state = 'waiting';
  slots: QueueSlot[] = [
    { id: 0, playerId: this._medicId, gameClass: 'medic', ready: false },
    { id: 1, playerId: this._scoutId, gameClass: 'soldier', ready: false },
    { id: 2, playerId: this._2ndMedicId, gameClass: 'medic', ready: false },
  ];
  findSlotByPlayerId(playerId: ObjectId) { return this.slots.find(s => playerId.equals(s.playerId)); }
}

describe('FriendsService', () => {
  let service: FriendsService;
  let queueService: QueueServiceStub;
  let queueGateway: QueueGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: QueueService, useClass: QueueServiceStub },
        QueueGateway,
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    queueService = module.get(QueueService);
    queueGateway = module.get(QueueGateway);
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markFriend()', () => {
    describe('when the queue is in launching state', () => {
      beforeEach(() => {
        queueService.state = 'launching';
      });

      it('should fail', () => {
        expect(() => service.markFriend(queueService._medicId, queueService._scoutId))
          .toThrowError('cannot make friends at this stage');
      });
    });

    describe('when the medic is not in the queue', () => {
      beforeEach(() => {
        queueService.slots = queueService.slots.filter(s => !s.playerId.equals(queueService._medicId));
      });

      it('should fail', () => {
        expect(() => service.markFriend(queueService._medicId, queueService._scoutId))
          .toThrowError('player not in the queue');
      });
    });

    describe('when the to-be friend is not in the queue', () => {
      beforeEach(() => {
        queueService.slots = queueService.slots.filter(s => !s.playerId.equals(queueService._scoutId));
      });

      it('should fail', () => {
        expect(() => service.markFriend(queueService._medicId, queueService._scoutId))
          .toThrowError('player not in the queue');
      });
    });

    describe('when the should-be medic is not a medic after all', () => {
      beforeEach(() => {
        queueService.slots[0].gameClass = 'scout';
      });

      it('should fail', () => {
        expect(() => service.markFriend(queueService._medicId, queueService._scoutId))
          .toThrowError('only medics can make friends');
      });
    });

    describe('when the to-be friend is also a medic', () => {
      beforeEach(() => {
        queueService.slots[1].gameClass = 'medic';
      });

      it('should fail', () => {
        expect(() => service.markFriend(queueService._medicId, queueService._scoutId))
          .toThrowError('cannot make the other medic as a friend');
      });
    });

    describe('when the to-be friend is already marked as a friend by the other medic', () => {
      beforeEach(() => {
        service.markFriend(queueService._2ndMedicId, queueService._scoutId);
      });

      it('should fail', () => {
        expect(() => service.markFriend(queueService._medicId, queueService._scoutId))
          .toThrowError('this player is already marked as a friend by another player');
      });
    });

    it('should mark friends', () => {
      const friendships = service.markFriend(queueService._medicId, queueService._scoutId);
      expect(friendships).toEqual([{ sourcePlayerId: queueService._medicId, targetPlayerId: queueService._scoutId }]);
    });

    it('should unmark friends', () => {
      service.markFriend(queueService._medicId, queueService._scoutId);
      const friendships = service.markFriend(queueService._medicId, null);
      expect(friendships).toEqual([]);
    });

    describe('when attempting to change friend', () => {
      let soldierId: ObjectId;

      beforeEach(() => {
        soldierId = new ObjectId();
        queueService.slots.push({ id: 2, playerId: soldierId, gameClass: 'soldier', ready: false });
        service.markFriend(queueService._medicId, queueService._scoutId);
      });

      it('should remove previouse friendship', () => {
        const friendships = service.markFriend(queueService._medicId, soldierId);
        expect(friendships).toEqual([{ sourcePlayerId: queueService._medicId, targetPlayerId: soldierId }]);
      });
    });

    it('should emit an event over the gateway', () => {
      const spy = spyOn(queueGateway, 'emitFriendshipsUpdate');
      service.markFriend(queueService._medicId, queueService._scoutId);
      expect(spy).toHaveBeenCalledWith([{ sourcePlayerId: queueService._medicId, targetPlayerId: queueService._scoutId }]);
    });
  });

  describe('onSlotsChange', () => {
    beforeEach(() => {
      service.markFriend(queueService._medicId, queueService._scoutId);
    });

    describe('when the medic leaves the queue', () => {
      beforeEach(() => {
        queueService.slots = queueService.slots.filter(s => !s.playerId.equals(queueService._medicId));
        queueService.slotsChange.next(queueService.slots);
      });

      it('should remove the friendship', () => {
        expect(service.friendships).toEqual([]);
      });
    });

    describe('when the medic changes class', () => {
      beforeEach(() => {
        queueService.slots[0].gameClass = 'soldier';
        queueService.slotsChange.next(queueService.slots);
      });

      it('should remove the friendship', () => {
        expect(service.friendships).toEqual([]);
      });
    });

    describe('when the friend leaves the queue', () => {
      beforeEach(() => {
        queueService.slots = queueService.slots.filter(s => !s.playerId.equals(queueService._scoutId));
        queueService.slotsChange.next(queueService.slots);
      });

      it('should not remove the friendship', () => {
        expect(service.friendships).toEqual([{ sourcePlayerId: queueService._medicId, targetPlayerId: queueService._scoutId }]);
      });
    });
  });
});
