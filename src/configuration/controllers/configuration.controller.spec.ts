import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { DefaultPlayerSkill } from '../dto/default-player-skill';
import { Etf2lAccountRequired } from '../dto/etf2l-account-required';
import { MinimumTf2InGameHours } from '../dto/minimum-tf2-in-game-hours';
import { WhitelistId } from '../dto/whitelist-id';
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
      expect(await controller.getDefaultPlayerSkill()).toEqual(new DefaultPlayerSkill(defaultPlayerSkill));
    });
  });

  describe('#setDefaultPlayerSkill()', () => {
    const defaultPlayerSkill = new Map([[Tf2ClassName.medic, 5]]);

    beforeEach(() => {
      configurationService.setDefaultPlayerSkill.mockResolvedValue(defaultPlayerSkill);
    });

    it('should set default player skill', async () => {
      const ret = await controller.setDefaultPlayerSkill(new DefaultPlayerSkill(new Map([[Tf2ClassName.medic, 5]])));
      expect(ret).toEqual(new DefaultPlayerSkill(defaultPlayerSkill));
      expect(configurationService.setDefaultPlayerSkill).toHaveBeenCalledWith(defaultPlayerSkill);
    });
  });

  describe('#getWhitelistId()', () => {
    beforeEach(() => {
      configurationService.getWhitelistId.mockResolvedValue('etf2l_6v6');
    });

    it('should return the whitelist id', async () => {
      expect(await controller.getWhitelistId()).toEqual(new WhitelistId('etf2l_6v6'));
    });
  });

  describe('#setWhitelistId()', () => {
    beforeEach(() => {
      configurationService.setWhitelistId.mockResolvedValue('etf2l_6v6');
    });

    it('should set the whitelist id', async () => {
      const ret = await controller.setWhitelistId(new WhitelistId('etf2l_6v6'));
      expect(ret).toEqual(new WhitelistId('etf2l_6v6'));
      expect(configurationService.setWhitelistId).toHaveBeenCalledWith('etf2l_6v6');
    });
  });

  describe('#isEtf2lAccountRequired()', () => {
    beforeEach(() => {
      configurationService.isEtf2lAccountRequired.mockResolvedValue(true);
    });

    it('should return the value', async () => {
      expect(await controller.isEtf2lAccountRequired()).toEqual(new Etf2lAccountRequired(true));
    });
  });

  describe('#setEtf2lAccountRequired()', () => {
    beforeEach(() => {
      configurationService.setEtf2lAccountRequired.mockResolvedValue(false);
    });

    it('should set the value', async () => {
      const ret = await controller.setEtf2lAccountRequired(new Etf2lAccountRequired(false));
      expect(ret).toEqual(new Etf2lAccountRequired(false));
      expect(configurationService.setEtf2lAccountRequired).toHaveBeenCalledWith(false);
    })
  });

  describe('#getMinimumTf2InGameHours()', () => {
    beforeEach(() => {
      configurationService.getMinimumTf2InGameHours.mockResolvedValue(500);
    });

    it('should return the value', async () => {
      expect(await controller.getMinimumTf2InGameHours()).toEqual(new MinimumTf2InGameHours(500));
    });
  });

  describe('#setMinimumTf2InGameHours()', () => {
    beforeEach(() => {
      configurationService.setMinimumTf2InGameHours.mockResolvedValue(1000);
    });

    it('should set the value', async () => {
      const ret = await controller.setMinimumTf2InGameHours(new MinimumTf2InGameHours(1000));
      expect(ret).toEqual(new MinimumTf2InGameHours(1000));
      expect(configurationService.setMinimumTf2InGameHours).toHaveBeenCalledWith(1000);
    });
  });
});
