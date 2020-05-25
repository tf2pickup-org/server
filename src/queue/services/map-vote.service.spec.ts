import { Test, TestingModule } from '@nestjs/testing';
import { MapVoteService } from './map-vote.service';
import { QueueConfigService } from './queue-config.service';
import { QueueService } from './queue.service';
import { Subject } from 'rxjs';
import { QueueGateway } from '../gateways/queue.gateway';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';

jest.mock('./queue.service');
jest.mock('../gateways/queue.gateway');
jest.mock('@nestjs/config');

class QueueConfigServiceStub {
  queueConfig = {
    maps: [
      {
        'name': 'cp_badlands',
        'configName': '5cp'
      },
      {
        'name': 'cp_process_final',
        'configName': '5cp'
      },
      {
        'name': 'cp_snakewater_final1',
        'configName': '5cp'
      },
    ],
  };
}

describe('MapVoteService', () => {
  let service: MapVoteService;
  let queueConfigService: QueueConfigServiceStub;
  let queueService: QueueService;
  let queueGateway: QueueGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapVoteService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        QueueService,
        QueueGateway,
        ConfigService,
      ],
    }).compile();

    service = module.get<MapVoteService>(MapVoteService);
    queueConfigService = module.get(QueueConfigService);
    queueService = module.get(QueueService);
    queueGateway = module.get(QueueGateway);
  });

  beforeEach(() => {
    // @ts-expect-error
    queueService.playerLeave = new Subject<ObjectId>();
    queueService.isInQueue = () => true;
  });

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reset all votes initially', () => {
    expect(service.mapOptions.every(m => queueConfigService.queueConfig.maps.map(n => n.name).includes(m))).toBe(true);
    expect(service.results.every(r => r.voteCount === 0)).toBe(true);
  });

  describe('#voteForMap()', () => {
    it('should save the vote', () => {
      service.voteForMap(new ObjectId(), 'cp_badlands');
      expect(service.results).toEqual(jasmine.arrayContaining([
        { map: 'cp_badlands', voteCount: 1 },
        { map: 'cp_process_final', voteCount: 0 },
        { map: 'cp_snakewater_final1', voteCount: 0 },
      ]));
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
    });

    it('should deny voting for maps out of pool', () => {
      expect(() => service.voteForMap(new ObjectId(), 'cp_sunshine')).toThrowError();
    });

    describe('when the given player is not in the queue', () => {
      beforeEach(() => {
        queueService.isInQueue = () => false;
      });

      it('should throw an error', () => {
        expect(() => service.voteForMap(new ObjectId(), 'cp_badlands')).toThrowError();
      });
    });

    it('should remove the player\'s vote when the player leaves the queue', () => {
      const playerId = new ObjectId();
      service.voteForMap(playerId, 'cp_badlands');
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
      // @ts-expect-error
      queueService.playerLeave.next(playerId);
      expect(service.voteCountForMap('cp_badlands')).toEqual(0);
    });

    it('should emit the event over ws', () => {
      const spy = jest.spyOn(queueGateway, 'emitVoteResultsUpdate');
      service.voteForMap(new ObjectId(), 'cp_badlands');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#getWinner()', () => {
    it('should return the map with the most votes', () => {
      service.voteForMap(new ObjectId(), 'cp_badlands');
      expect(service.getWinner()).toEqual('cp_badlands');
    });

    it('should return one of two most-voted maps', () => {
      service.voteForMap(new  ObjectId(), 'cp_badlands');
      service.voteForMap(new ObjectId(), 'cp_process_final');
      expect(service.getWinner()).toMatch(/cp_badlands|cp_process_final/);
    });

    it('should eventually reset the vote', done => {
      service.voteForMap(new ObjectId(), 'cp_badlands');
      service.voteForMap(new ObjectId(), 'cp_process_final');
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
