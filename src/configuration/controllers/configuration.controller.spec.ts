import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
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

  describe('#getDefaultPlayerSkill()', () => {
    const defaultPlayerSkill = new Map([[Tf2ClassName.soldier, 2], [Tf2ClassName.scout, 4]]);

    beforeEach(() => {
      configurationService.getDefaultPlayerSkill.mockResolvedValue(defaultPlayerSkill);
    });

    it('should return default player skill', async () => {
      expect(await controller.getDefaultPlayerSkill()).toEqual(defaultPlayerSkill);
    });
  });

  describe('#setDefaultPlayerSkill()', () => {
    const defaultPlayerSkill = new Map([[Tf2ClassName.medic, 5]]);

    beforeEach(() => {
      configurationService.setDefaultPlayerSkill.mockResolvedValue(defaultPlayerSkill);
    });

    it('should set default player skll', async () => {
      const ret = await controller.setDefaultPlayerSkill({ [Tf2ClassName.medic]: 5 });
      expect(ret).toEqual(defaultPlayerSkill);
      expect(configurationService.setDefaultPlayerSkill).toHaveBeenCalledWith(defaultPlayerSkill);
    });
  });
});
