import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfApiService } from '../services/serveme-tf-api.service';
import { ServemeTfController } from './serveme-tf.controller';

jest.mock('../services/serveme-tf-api.service');

describe('ServemeTfController', () => {
  let controller: ServemeTfController;
  let servemeTfApiService: jest.Mocked<ServemeTfApiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServemeTfController],
      providers: [ServemeTfApiService],
    }).compile();

    controller = module.get<ServemeTfController>(ServemeTfController);
    servemeTfApiService = module.get(ServemeTfApiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#isEnabled()', () => {
    it('should return true', () => {
      expect(controller.isEnabled()).toEqual({ isEnabled: true });
    });
  });

  describe('#listAllServers()', () => {
    beforeEach(() => {
      servemeTfApiService.listServers.mockResolvedValue([
        {
          id: 9118,
          name: 'NewBrigade #1',
          flag: 'de',
          ip: 'new.fakkelbrigade.eu',
          port: '27015',
          ip_and_port: 'new.fakkelbrigade.eu:27015',
          sdr: false,
          latitude: 51.2993,
          longitude: 9.491,
        },
        {
          id: 9128,
          name: 'NewBrigade #11',
          flag: 'de',
          ip: 'new.fakkelbrigade.eu',
          port: '27115',
          ip_and_port: 'new.fakkelbrigade.eu:27115',
          sdr: false,
          latitude: 51.2993,
          longitude: 9.491,
        },
      ]);
    });

    it('should return all available servers', async () => {
      const ret = await controller.listAllServers();
      expect(ret.length).toBe(2);
      expect(servemeTfApiService.listServers).toHaveBeenCalledTimes(1);
    });
  });
});
