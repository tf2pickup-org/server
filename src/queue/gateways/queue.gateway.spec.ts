import { Test, TestingModule } from '@nestjs/testing';
import { QueueGateway } from './queue.gateway';
import { QueueService } from '../services/queue.service';
import { Subject } from 'rxjs';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { ObjectId } from 'mongodb';

jest.mock('../services/queue.service');
jest.mock('../services/map-vote.service');
jest.mock('../services/queue-announcements.service');
jest.mock('../services/friends.service');

// class QueueServiceStub {
//   slotsChange = new Subject<any>();
//   stateChange = new Subject<string>();

//   join(slotId: number, playerId: string) {
//     return new Promise(resolve => resolve([{ id: slotId, playerId }]));
//   }

//   leave(playerId: string) {
//     return { id: 0, playerId };
//   }

//   readyUp(playerId: string) {
//     return { id: 0, playerId, ready: true };
//   }
// }

// class MapVoteServiceStub {
//   resultsChange = new Subject<any[]>();
//   voteForMap(playerId: string, map: string) { return null; }
// }

class SocketStub {
  emit(event: string, ...args: any[]) { return null; }
}

// class QueueAnnouncementsServiceStub {
//   requests = [{ gameId: 'FAKE_GAME_ID', gameNumber: 5, gameClass: 'scout', team: 'BLU' }];
//   substituteRequests() { return new Promise(resolve => resolve(this.requests)); }
// }

// class FriendsServiceStub {
//   markFriend(player1: string, player2: string) { return null; }
// }

describe('QueueGateway', () => {
  let gateway: QueueGateway;
  let queueService: QueueService;
  let mapVoteService: MapVoteService;
  let socket: SocketStub;
  let queueAnnouncementsService: QueueAnnouncementsService;
  let friendsService: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueGateway,
        QueueService,
        MapVoteService,
        QueueAnnouncementsService,
        FriendsService,
      ],
    }).compile();

    gateway = module.get<QueueGateway>(QueueGateway);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
    queueAnnouncementsService = module.get(QueueAnnouncementsService);
    friendsService = module.get(FriendsService);

    socket = new SocketStub();
    gateway.afterInit(socket as any);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#joinQueue()', () => {
    beforeEach(() => {
      // @ts-expect-error
      queueService.join = (slotId, playerId) => Promise.resolve([{ id: slotId, playerId }]);
    });

    it('should join the queue', async () => {
      const spy = jest.spyOn(queueService, 'join');
      const ret = await gateway.joinQueue({ request: { user: { id: 'FAKE_ID' } } }, { slotId: 5 });
      expect(spy).toHaveBeenCalledWith(5, 'FAKE_ID');
      expect(ret).toEqual([ { id: 5, playerId: 'FAKE_ID' } ] as any);
    });
  });

  describe('#leaveQueue()', () => {
    beforeEach(() => {
      // @ts-expect-error
      queueService.leave = playerId => ({ id: 0, playerId });
    });

    it('should leave the queue', () => {
      const spy = jest.spyOn(queueService, 'leave');
      const ret = gateway.leaveQueue({ request: { user: { id: 'FAKE_ID' } } });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({ id: 0, playerId: 'FAKE_ID' } as any);
    });
  });

  describe('#playerReady()', () => {
    beforeEach(() => {
      // @ts-expect-error
      queueService.readyUp = playerId => ({ id: 0, playerId, ready: true });
    });

    it('should ready up the player', () => {
      const spy = jest.spyOn(queueService, 'readyUp');
      const ret = gateway.playerReady({ request: { user: { id: 'FAKE_ID' } } });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({ id: 0, playerId: 'FAKE_ID', ready: true } as any);
    });
  });

  describe('#markFriend()', () => {
    it('should mark friend', async () => {
      const friendId = new ObjectId();
      const spy = jest.spyOn(friendsService, 'markFriend');
      const ret = gateway.markFriend({ request: { user: { id: 'FAKE_ID' } } }, { friendPlayerId: friendId.toString() });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', friendId);
    });
  });

  describe('#voteForMap()', () => {
    it('should vote for the map', () => {
      const spy = jest.spyOn(mapVoteService, 'voteForMap');
      const ret = gateway.voteForMap({ request: { user: { id: 'FAKE_ID' } } }, { map: 'cp_badlands' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', 'cp_badlands');
      expect(ret).toEqual('cp_badlands');
    });
  });

  describe('#emitSlotsUpdate()', () => {
    it('should emit the event', () => {
      const spy = jest.spyOn(socket, 'emit');
      const slot = { id: 0, playerId: new ObjectId(), ready: true, gameClass: 'soldier', friend: null };
      gateway.emitSlotsUpdate([slot]);
      expect(spy).toHaveBeenCalledWith('queue slots update', [slot]);
    });
  });

  describe('#emitStateUpdate()', () => {
    it('should emit the event', () => {
      const spy = jest.spyOn(socket, 'emit');
      gateway.emitStateUpdate('launching');
      expect(spy).toHaveBeenCalledWith('queue state update', 'launching');
    });
  });

  describe('#emitVoteResultsUpdate()', () => {
    it('should emit the event', () => {
      const spy = jest.spyOn(socket, 'emit');
      gateway.emitVoteResultsUpdate([]);
      expect(spy).toHaveBeenCalledWith('map vote results update', jasmine.any(Array));
    });
  });

  describe('#updateSubstituteRequests()', () => {
    const requests = [{ gameId: 'FAKE_GAME_ID', gameNumber: 5, gameClass: 'scout', team: 'BLU' }];

    beforeEach(() => {
      queueAnnouncementsService.substituteRequests = () => Promise.resolve(requests);
    });

    it('should emit requests over the ws', async () => {
      const spy = jest.spyOn(socket, 'emit');
      await gateway.updateSubstituteRequests();
      expect(spy).toHaveBeenCalledWith('substitute requests update', requests);
    });
  });
});
