import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueConfigService } from '../services/queue-config.service';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';

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

class QueueAnnouncementsServiceStub {
  subRequests = [
    {
      gameId: '5e1fb93d9cacb6d6e08bc6bf',
      gameNumber: 514,
      gameClass: 'soldier',
      team: 'BLU',
    },
  ];

  substituteRequests() { return this.subRequests; }
}

describe('Queue Controller', () => {
  let controller: QueueController;
  let queueConfigService: QueueConfigServiceStub;
  let queueService: QueueServiceStub;
  let mapVoteService: MapVoteServiceStub;
  let queueAnnouncementsService: QueueAnnouncementsServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
        { provide: QueueAnnouncementsService, useClass: QueueAnnouncementsServiceStub },
      ],
      controllers: [QueueController],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueConfigService = module.get(QueueConfigService);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
    queueAnnouncementsService = module.get(QueueAnnouncementsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getQueue()', () => {
    it('should return current queue data', async () => {
      const ret = await controller.getQueue();
      expect(ret).toEqual({
        config: queueConfigService.queueConfig,
        slots: queueService.slots,
        state: queueService.state,
        mapVoteResults: mapVoteService.results,
        substituteRequests: queueAnnouncementsService.subRequests,
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

  describe('#getSubstituteRequests()', () => {
    it('should return substitute requests', async () => {
      expect(await controller.getSubstituteRequests()).toEqual(queueAnnouncementsService.subRequests);
    });
  });
});
