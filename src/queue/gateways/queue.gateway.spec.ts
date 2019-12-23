import { Test, TestingModule } from '@nestjs/testing';
import { QueueGateway } from './queue.gateway';
import { QueueService } from '../services/queue.service';
import { Subject } from 'rxjs';
import { MapVoteService } from '../services/map-vote.service';

class QueueServiceStub {
  slotsChange = new Subject<any>();
  stateChange = new Subject<string>();

  join(slotId: number, playerId: string) {
    return new Promise(resolve => resolve([{ id: slotId, playerId }]));
  }

  leave(playerId: string) {
    return { id: 0, playerId };
  }

  readyUp(playerId: string) {
    return { id: 0, playerId, ready: true };
  }

  markFriend(playerId: string, friendId: string) {
    return new Promise(resolve => resolve({ id: 0, player: playerId, friend: friendId }));
  }
}

class MapVoteServiceStub {
  resultsChange = new Subject<any[]>();
  voteForMap(playerId: string, map: string) { return null; }
}

describe('QueueGateway', () => {
  let gateway: QueueGateway;
  let queueService: QueueServiceStub;
  let mapVoteService: MapVoteServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueGateway,
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
      ],
    }).compile();

    gateway = module.get<QueueGateway>(QueueGateway);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#joinQueue()', () => {
    it('should join the queue', async () => {
      const spy = spyOn(queueService, 'join').and.callThrough();
      const ret = await gateway.joinQueue({ request: { user: { id: 'FAKE_ID' } } }, { slotId: 5 });
      expect(spy).toHaveBeenCalledWith(5, 'FAKE_ID');
      expect(ret).toEqual([ { id: 5, playerId: 'FAKE_ID' } ] as any);
    });
  });

  describe('#leaveQueue()', () => {
    it('should leave the queue', () => {
      const spy = spyOn(queueService, 'leave').and.callThrough();
      const ret = gateway.leaveQueue({ request: { user: { id: 'FAKE_ID' } } });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({ id: 0, playerId: 'FAKE_ID' } as any);
    });
  });

  describe('#playerReady()', () => {
    it('should ready up the player', () => {
      const spy = spyOn(queueService, 'readyUp').and.callThrough();
      const ret = gateway.playerReady({ request: { user: { id: 'FAKE_ID' } } });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({ id: 0, playerId: 'FAKE_ID', ready: true } as any);
    });
  });

  describe('#markFriend()', () => {
    it('should mark friend', async () => {
      const spy = spyOn(queueService, 'markFriend').and.callThrough();
      const ret = await gateway.markFriend({ request: { user: { id: 'FAKE_ID' } } }, { friendPlayerId: 'FAKE_FRIEND_ID' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', 'FAKE_FRIEND_ID');
      expect(ret).toEqual({ id: 0, player: 'FAKE_ID', friend: 'FAKE_FRIEND_ID' } as any);
    });
  });

  describe('#voteForMap()', () => {
    it('should vote for the map', () => {
      const spy = spyOn(mapVoteService, 'voteForMap').and.callThrough();
      const ret = gateway.voteForMap({ request: { user: { id: 'FAKE_ID' } } }, { map: 'cp_badlands' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', 'cp_badlands');
      expect(ret).toEqual('cp_badlands');
    });
  });

  describe('#afterInit()', () => {
    const socket = { emit: (...args: any[]) => null };

    it('should subscribe to slot change event', () => {
      const spy = spyOn(socket, 'emit').and.callThrough();
      gateway.afterInit(socket as any);

      const slot = { id: 0, playerId: 'FAKE_ID', ready: true };
      queueService.slotsChange.next([ slot ]);
      expect(spy).toHaveBeenCalledWith('queue slots update', [ slot ]);
    });

    it('should subsribe to state change event', () => {
      const spy = spyOn(socket, 'emit').and.callThrough();
      gateway.afterInit(socket as any);

      queueService.stateChange.next('waiting');
      expect(spy).toHaveBeenCalledWith('queue state update', 'waiting');
    });

    it('should subscribe to map results change event', () => {
      const spy = spyOn(socket, 'emit').and.callThrough();
      gateway.afterInit(socket as any);

      const results = [ { map: 'cp_fake_rc1', voteCount: 2 } ];
      mapVoteService.resultsChange.next(results);
      expect(spy).toHaveBeenCalledWith('map vote results update', results);
    });
  });
});
