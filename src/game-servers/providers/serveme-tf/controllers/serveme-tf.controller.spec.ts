import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfConfiguration } from '../models/serveme-tf-configuration';
import { ServemeTfApiService } from '../services/serveme-tf-api.service';
import { ServemeTfConfigurationService } from '../services/serveme-tf-configuration.service';
import { ServemeTfController } from './serveme-tf.controller';

jest.mock('../services/serveme-tf-api.service');
jest.mock('../services/serveme-tf-configuration.service');

describe('ServemeTfController', () => {
  let controller: ServemeTfController;
  let servemeTfApiService: jest.Mocked<ServemeTfApiService>;
  let servemeTfConfigurationService: jest.Mocked<ServemeTfConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServemeTfController],
      providers: [ServemeTfApiService, ServemeTfConfigurationService],
    }).compile();

    controller = module.get<ServemeTfController>(ServemeTfController);
    servemeTfApiService = module.get(ServemeTfApiService);
    servemeTfConfigurationService = module.get(ServemeTfConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

  describe('#getConfiguration()', () => {
    const configuration: ServemeTfConfiguration = {
      key: 'serveme-tf',
      preferredRegion: 'de',
    };

    beforeEach(() => {
      servemeTfConfigurationService.getConfiguration.mockResolvedValue(
        configuration,
      );
    });

    it('should return the configuration', async () => {
      expect(await controller.getConfiguration()).toEqual(configuration);
      expect(
        servemeTfConfigurationService.getConfiguration,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('#setConfiguration()', () => {
    const configuration: ServemeTfConfiguration = {
      key: 'serveme-tf',
      preferredRegion: 'de',
    };

    beforeEach(() => {
      servemeTfConfigurationService.getConfiguration.mockResolvedValue(
        configuration,
      );
    });

    it('should set the configuration and return the updated one', async () => {
      const ret = await controller.setConfiguration(configuration);
      expect(
        servemeTfConfigurationService.setConfiguration,
      ).toHaveBeenCalledWith(configuration);
      expect(ret).toEqual(configuration);
    });
  });
});
