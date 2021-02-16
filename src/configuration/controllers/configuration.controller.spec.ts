import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { Configuration } from '../models/configuration';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationController } from './configuration.controller';

jest.mock('../services/configuration.service');

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [
        ConfigurationService,
      ],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    configurationService = module.get(ConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getConfiguration()', () => {
    const configuration: Configuration = { defaultPlayerSkill: new Map([[Tf2ClassName.soldier, 3]]) };

    beforeEach(() => {
      configurationService.getConfiguration.mockResolvedValue(configuration);
    });

    it('should return the configuration', async () => {
      expect(await controller.getConfiguration()).toEqual(configuration);
    });
  });

  describe('#setConfiguration()', () => {
    const configuration: Configuration = { defaultPlayerSkill: new Map([[Tf2ClassName.soldier, 2]]), whitelistId: '12345' };

    beforeEach(() => {
      configurationService.setConfiguration.mockImplementation(configuration => Promise.resolve(configuration));
    });

    it('should set the configuration', async () => {
      const ret = await controller.setConfiguration(configuration);
      expect(ret).toEqual(configuration);
      expect(configurationService.setConfiguration).toHaveBeenCalledWith(configuration);
    });
  });
});
