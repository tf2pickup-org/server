import { Test, TestingModule } from '@nestjs/testing';
import { QueueGateway } from './queue.gateway';
import { QueueService } from '../services/queue.service';
import { Subject } from 'rxjs';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { Events } from '@/events/events';

jest.mock('../services/queue.service');

class MapVoteServiceStub {
  resultsChange = new Subject<any[]>();
  voteForMap(playerId: string, map: string) { return null; }
}

class SocketStub {
  emit = jest.fn();
}

class QueueAnnouncementsServiceStub {
  requests = [{ gameId: 'FAKE_GAME_ID', gameNumber: 5, gameClass: 'scout', team: 'BLU' }];
  substituteRequests() { return new Promise(resolve => resolve(this.requests)); }
}

class FriendsServiceStub {
  markFriend(player1: string, player2: string) { return null; }
}

describe('QueueGateway', () => {
  let gateway: QueueGateway;
  let queueService: QueueService;
  let mapVoteService: MapVoteServiceStub;
  let socket: SocketStub;
  let queueAnnouncementsService: QueueAnnouncementsServiceStub;
  let friendsService: FriendsServiceStub;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueGateway,
        Events,
        QueueService,
        { provide: MapVoteService, useClass: MapVoteServiceStub },
        { provide: QueueAnnouncementsService, useClass: QueueAnnouncementsServiceStub },
        { provide: FriendsService, useClass: FriendsServiceStub },
      ],
    }).compile();

    gateway = module.get<QueueGateway>(QueueGateway);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
    queueAnnouncementsService = module.get(QueueAnnouncementsService);
    friendsService = module.get(FriendsService);
    events = module.get(Events);

    gateway.onModuleInit();

    socket = new SocketStub();
    gateway.afterInit(socket as any);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#joinQueue()', () => {
    beforeEach(() => {
      queueService.join = (slotId, playerId) => Promise.resolve([{ id: slotId, playerId, gameClass: 'scout', ready: false }]);
    });

    it('should join the queue', async () => {
      const spy = jest.spyOn(queueService, 'join');
      const ret = await gateway.joinQueue({ request: { user: { id: 'FAKE_ID' } } }, { slotId: 5 });
      expect(spy).toHaveBeenCalledWith(5, 'FAKE_ID');
      expect(ret).toEqual([ { id: 5, playerId: 'FAKE_ID', gameClass: 'scout', ready: false } ]);
    });
  });

  describe('#leaveQueue()', () => {
    beforeEach(() => {
      queueService.leave = playerId => ({ id: 0, playerId, gameClass: 'scout', ready: false });
    });

    it('should leave the queue', () => {
      const spy = jest.spyOn(queueService, 'leave');
      const ret = gateway.leaveQueue({ request: { user: { id: 'FAKE_ID' } } });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({ id: 0, playerId: 'FAKE_ID', gameClass: 'scout', ready: false });
    });
  });

  describe('#playerReady()', () => {
    beforeEach(() => {
      queueService.readyUp = playerId => ({ id: 0, playerId, gameClass: 'scout', ready: true });
    });

    it('should ready up the player', () => {
      const spy = jest.spyOn(queueService, 'readyUp');
      const ret = gateway.playerReady({ request: { user: { id: 'FAKE_ID' } } });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({ id: 0, playerId: 'FAKE_ID', gameClass: 'scout', ready: true });
    });
  });

  describe('#markFriend()', () => {
    it('should mark friend', async () => {
      const spy = jest.spyOn(friendsService, 'markFriend');
      const ret = await gateway.markFriend({ request: { user: { id: 'FAKE_ID' } } }, { friendPlayerId: 'FAKE_FRIEND_ID' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', 'FAKE_FRIEND_ID');
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

  describe('when the queueSlotsChange event is fired', () => {
    beforeEach(() => {
      events.queueSlotsChange.next({ slots: [ { id: 0, playerId: 'FAKE_ID', ready: true, gameClass: 'soldier' } ] });
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('queue slots update', [ { id: 0, playerId: 'FAKE_ID', ready: true, gameClass: 'soldier' } ]);
    });
  });

  describe('when the queueStateChange event is fired', () => {
    beforeEach(() => {
      events.queueStateChange.next({ state: 'ready' });
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('queue state update', 'ready');
    });
  });

  describe('#emitVoteResultsUpdate()', () => {
    it('should emit the event', () => {
      const spy = jest.spyOn(socket, 'emit');
      gateway.emitVoteResultsUpdate([]);
      expect(spy).toHaveBeenCalledWith('map vote results update', expect.any(Array));
    });
  });

  describe('#updateSubstituteRequests()', () => {
    it('should emit requests over the ws', async () => {
      const spy = jest.spyOn(socket, 'emit');
      await gateway.updateSubstituteRequests();
      expect(spy).toHaveBeenCalledWith('substitute requests update', queueAnnouncementsService.requests);
    });
  });
});
