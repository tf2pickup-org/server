import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueConfigService } from '../services/queue-config.service';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';

class QueueConfigServiceStub {
  queueConfig = { some_param: 'some_value' };
}

class QueueServiceStub {
  slots = [ { id: 0, playerId: 'FAKE_ID' }, { id: 1, playerId: null } ];
  state = 'testing';
}

class MapVoteServiceStub {
  results = [ 'some', 'results' ];
}

describe('Queue Controller', () => {
  let controller: QueueController;
  let queueConfigService: QueueConfigServiceStub;
  let queueService: QueueServiceStub;
  let mapVoteService: MapVoteServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
      ],
      controllers: [QueueController],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueConfigService = module.get(QueueConfigService);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getQueue()', () => {
    it('should return current queue data', () => {
      const ret = controller.getQueue();
      expect(ret).toEqual({
        config: queueConfigService.queueConfig,
        slots: queueService.slots,
        state: queueService.state,
        mapVoteResults: mapVoteService.results,
      } as any);
    });
  });

  describe('#getQueueConfig()', () => {
    it('should return queue config', () => {
      expect(controller.getQueueConfig()).toEqual(queueConfigService.queueConfig as any);
    });
  });

  describe('#getQueueState()', () => {
    it('should return queue state', () => {
      expect(controller.getQueueState()).toEqual(queueService.state);
    });
  });

  describe('#getQueueSlots()', () => {
    it('should return queue slots', () => {
      expect(controller.getQueueSlots()).toEqual(queueService.slots as any);
    });
  });

  describe('#getMapVoteResults()', () => {
    it('should return map vote results', () => {
      expect(controller.getMapVoteResults()).toEqual(mapVoteService.results as any);
    });
  });
});
