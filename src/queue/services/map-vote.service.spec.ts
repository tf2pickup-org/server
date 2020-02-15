import { Test, TestingModule } from '@nestjs/testing';
import { MapVoteService } from './map-vote.service';
import { QueueConfigService } from './queue-config.service';
import { QueueService } from './queue.service';
import { Subject } from 'rxjs';
import { QueueGateway } from '../gateways/queue.gateway';

class QueueConfigServiceStub {
  queueConfig = {
    maps: [1, 2, 3, 4].map(n => `fake_map_${n}`),
  };
}

class QueueServiceStub {
  public isInQueue(playerId: string) { return true; }
  playerLeave = new Subject<string>();
}

class QueueGatewayStub {
  emitVoteResultsUpdate(results: any[]) { return null; }
}

describe('MapVoteService', () => {
  let service: MapVoteService;
  let queueConfigService: QueueConfigServiceStub;
  let queueService: QueueServiceStub;
  let queueGateway: QueueGatewayStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapVoteService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: QueueGateway, useClass: QueueGatewayStub },
      ],
    }).compile();

    service = module.get<MapVoteService>(MapVoteService);
    queueConfigService = module.get(QueueConfigService);
    queueService = module.get(QueueService);
    queueGateway = module.get(QueueGateway);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reset all votes initially', () => {
    expect(service.mapOptions.every(m => queueConfigService.queueConfig.maps.includes(m))).toBe(true);
    expect(service.results.every(r => r.voteCount === 0)).toBe(true);
  });

  describe('#voteForMap()', () => {
    beforeEach(() => {
      service.mapOptions = ['cp_badlands', 'cp_process_final', 'cp_snakewater_final1'];
    });

    it('should save the vote', () => {
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(service.results).toEqual([
        { map: 'cp_badlands', voteCount: 1 },
        { map: 'cp_process_final', voteCount: 0 },
        { map: 'cp_snakewater_final1', voteCount: 0 },
      ]);
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
    });

    it('should deny voting for maps out of pool', () => {
      expect(() => service.voteForMap('FAKE_ID', 'cp_sunshine')).toThrowError();
    });

    it('should deny voting if the player is not in the queue', () => {
      jest.spyOn(queueService, 'isInQueue').mockReturnValue(false);
      expect(() => service.voteForMap('FAKE_ID', 'cp_badlands')).toThrowError();
    });

    it('should remove the player\'s vote when the player leaves the queue', () => {
      service.voteForMap('FAKE_PLAYER_ID', 'cp_badlands');
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
      queueService.playerLeave.next('FAKE_PLAYER_ID');
      expect(service.voteCountForMap('cp_badlands')).toEqual(0);
    });

    it('should emit the event over ws', () => {
      const spy = jest.spyOn(queueGateway, 'emitVoteResultsUpdate');
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#getWinner()', () => {
    beforeEach(() => {
      service.mapOptions = ['cp_badlands', 'cp_process_final', 'cp_snakewater_final1'];
    });

    it('should return the map with the most votes', () => {
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(service.getWinner()).toEqual('cp_badlands');
    });

    it('should return one of two most-voted maps', () => {
      service.voteForMap('FAKE_ID_1', 'cp_badlands');
      service.voteForMap('FAKE_ID_2', 'cp_process_final');
      expect(service.getWinner()).toMatch(/cp_badlands|cp_process_final/);
    });

    it('should eventually reset the vote', done => {
      service.voteForMap('FAKE_ID_1', 'cp_badlands');
      service.voteForMap('FAKE_ID_2', 'cp_process_final');
      const spy = jest.spyOn(queueGateway, 'emitVoteResultsUpdate');

      const map = service.getWinner();
      setImmediate(() => {
        expect(service.results.every(r => r.voteCount === 0)).toBe(true);
        expect(service.mapOptions.every(m => m !== map));
        expect(spy).toHaveBeenCalled();
        done();
      });
    });
  });
});
