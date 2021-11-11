import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from '../services/statistics.service';
import { StatisticsController } from './statistics.controller';

jest.mock('../services/statistics.service');

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let statisticsService: jest.Mocked<StatisticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [StatisticsService],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
    statisticsService = module.get(StatisticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getPlayedMapsCount()', () => {
    beforeEach(() => {
      statisticsService.getPlayedMapsCount.mockResolvedValue([
        {
          mapName: 'process',
          count: 635,
        },
        {
          mapName: 'gullywash',
          count: 509,
        },
      ]);
    });

    it('should return played maps count stats', async () => {
      expect(await controller.getPlayedMapsCount()).toEqual([
        {
          mapName: 'process',
          count: 635,
        },
        {
          mapName: 'gullywash',
          count: 509,
        },
      ]);
    });
  });
});
