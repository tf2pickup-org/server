import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationEntry } from '../models/configuration-entry';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import { DefaultPlayerSkill } from '../models/default-player-skill';
import { Etf2lAccountRequired } from '../models/etf2l-account-required';
import { MinimumTf2InGameHours } from '../models/minimum-tf2-in-game-hours';
import {
  MumbleOptions,
  SelectedVoiceServer,
  VoiceServer,
} from '../models/voice-server';
import { WhitelistId } from '../models/whitelist-id';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationController } from './configuration.controller';

jest.mock('../services/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => {
    const mockConfiguration = new Map();
    return {
      set: jest.fn().mockImplementation((entry: ConfigurationEntry) => {
        mockConfiguration.set(entry.key, entry);
        return Promise.resolve();
      }),
      getDefaultPlayerSkill: jest
        .fn()
        .mockImplementation(() =>
          mockConfiguration.get(ConfigurationEntryKey.defaultPlayerSkill),
        ),
      getWhitelistId: jest
        .fn()
        .mockImplementation(() =>
          mockConfiguration.get(ConfigurationEntryKey.whitelistId),
        ),
      isEtf2lAccountRequired: jest
        .fn()
        .mockImplementation(() =>
          mockConfiguration.get(ConfigurationEntryKey.etf2lAccountRequired),
        ),
      getMinimumTf2InGameHours: jest
        .fn()
        .mockImplementation(() =>
          mockConfiguration.get(ConfigurationEntryKey.minimumTf2InGameHours),
        ),
      getVoiceServer: jest
        .fn()
        .mockImplementation(() =>
          mockConfiguration.get(ConfigurationEntryKey.voiceServer),
        ),
    };
  }),
}));

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(() => {
    (
      ConfigurationService as jest.MockedClass<typeof ConfigurationService>
    ).mockClear();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [ConfigurationService],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    configurationService = module.get(ConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getDefaultPlayerSkill()', () => {
    let defaultPlayerSkill: DefaultPlayerSkill;

    beforeEach(() => {
      defaultPlayerSkill = new DefaultPlayerSkill();
      configurationService.set(defaultPlayerSkill);
    });

    it('should return default player skill', async () => {
      expect(await controller.getDefaultPlayerSkill()).toEqual(
        defaultPlayerSkill,
      );
    });
  });

  describe('#setDefaultPlayerSkill()', () => {
    let defaultPlayerSkill: DefaultPlayerSkill;

    beforeEach(() => {
      defaultPlayerSkill = new DefaultPlayerSkill();
      defaultPlayerSkill.value = new Map([[Tf2ClassName.medic, 5]]);
    });

    it('should set default player skill', async () => {
      const ret = await controller.setDefaultPlayerSkill(defaultPlayerSkill);
      expect(ret).toEqual(defaultPlayerSkill);
      expect(await controller.getDefaultPlayerSkill()).toEqual(
        defaultPlayerSkill,
      );
    });
  });

  describe('#getWhitelistId()', () => {
    let whitelistId: WhitelistId;

    beforeEach(() => {
      whitelistId = new WhitelistId('etf2l_6v6');
      configurationService.set(whitelistId);
    });

    it('should return the whitelist id', async () => {
      expect(await controller.getWhitelistId()).toEqual(whitelistId);
    });
  });

  describe('#setWhitelistId()', () => {
    let whitelistId: WhitelistId;

    beforeEach(() => {
      whitelistId = new WhitelistId('etf2l_6v6');
    });

    it('should set the whitelist id', async () => {
      const ret = await controller.setWhitelistId(whitelistId);
      expect(ret).toEqual(whitelistId);
      expect(await controller.getWhitelistId()).toEqual(whitelistId);
    });
  });

  describe('#isEtf2lAccountRequired()', () => {
    let etf2lAccountRequired: Etf2lAccountRequired;

    beforeEach(() => {
      etf2lAccountRequired = new Etf2lAccountRequired(true);
      configurationService.set(etf2lAccountRequired);
    });

    it('should return the value', async () => {
      expect(await controller.isEtf2lAccountRequired()).toEqual(
        etf2lAccountRequired,
      );
    });
  });

  describe('#setEtf2lAccountRequired()', () => {
    let etf2lAccountRequired: Etf2lAccountRequired;

    beforeEach(() => {
      etf2lAccountRequired = new Etf2lAccountRequired(true);
    });

    it('should set the value', async () => {
      const ret = await controller.setEtf2lAccountRequired(
        etf2lAccountRequired,
      );
      expect(ret).toEqual(etf2lAccountRequired);
      expect(await controller.isEtf2lAccountRequired()).toEqual(
        etf2lAccountRequired,
      );
    });
  });

  describe('#getMinimumTf2InGameHours()', () => {
    let minimumTf2InGameHours: MinimumTf2InGameHours;

    beforeEach(() => {
      minimumTf2InGameHours = new MinimumTf2InGameHours(500);
      configurationService.set(minimumTf2InGameHours);
    });

    it('should return the value', async () => {
      expect(await controller.getMinimumTf2InGameHours()).toEqual(
        minimumTf2InGameHours,
      );
    });
  });

  describe('#setMinimumTf2InGameHours()', () => {
    let minimumTf2InGameHours: MinimumTf2InGameHours;

    beforeEach(() => {
      minimumTf2InGameHours = new MinimumTf2InGameHours(1000);
    });

    it('should set the value', async () => {
      const ret = await controller.setMinimumTf2InGameHours(
        minimumTf2InGameHours,
      );
      expect(ret).toEqual(minimumTf2InGameHours);
      expect(await controller.getMinimumTf2InGameHours()).toEqual(
        minimumTf2InGameHours,
      );
    });
  });

  describe('#getVoiceServer()', () => {
    let voiceServer: VoiceServer;

    beforeEach(() => {
      voiceServer = new VoiceServer();
      configurationService.set(voiceServer);
    });

    it('should return the value', async () => {
      expect(await controller.getVoiceServer()).toEqual(voiceServer);
    });
  });

  describe('#setVoiceServer', () => {
    let voiceServer: VoiceServer;

    beforeEach(() => {
      voiceServer = new VoiceServer();
      const mumble = new MumbleOptions();
      mumble.url = 'melkor.tf';
      mumble.port = 64738;
      voiceServer.mumble = mumble;
      voiceServer.type = SelectedVoiceServer.mumble;
    });

    it('should set the voice server config', async () => {
      const ret = await controller.setVoiceServer(voiceServer);
      expect(ret).toEqual(voiceServer);
      expect(await controller.getVoiceServer()).toEqual(voiceServer);
    });
  });
});
