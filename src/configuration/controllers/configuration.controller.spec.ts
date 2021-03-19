import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { DefaultPlayerSkill } from '../dto/default-player-skill';
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
});
