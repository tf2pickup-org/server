import { Test, TestingModule } from '@nestjs/testing';
import { DefaultPlayerSkill } from '../models/default-player-skill';
import { Etf2lAccountRequired } from '../models/etf2l-account-required';
import { MinimumTf2InGameHours } from '../models/minimum-tf2-in-game-hours';
import { VoiceServer } from '../models/voice-server';
import { WhitelistId } from '../models/whitelist-id';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationController } from './configuration.controller';

jest.mock('../services/configuration.service');

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let configurationService: jest.Mocked<ConfigurationService>;

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
      configurationService.getDefaultPlayerSkill.mockResolvedValue(
        defaultPlayerSkill,
      );
    });

    it('should return default player skill', async () => {
      expect(await controller.getDefaultPlayerSkill()).toEqual(
        defaultPlayerSkill,
      );
    });
  });

  describe('#setDefaultPlayerSkill()', () => {
    // const defaultPlayerSkill = new Map([[Tf2ClassName.medic, 5]]);
    // beforeEach(() => {
    //   configurationService.setDefaultPlayerSkill.mockResolvedValue(
    //     defaultPlayerSkill,
    //   );
    // });
    // it('should set default player skill', async () => {
    //   const ret = await controller.setDefaultPlayerSkill(
    //     new DefaultPlayerSkill(new Map([[Tf2ClassName.medic, 5]])),
    //   );
    //   expect(ret).toEqual(new DefaultPlayerSkill(defaultPlayerSkill));
    //   expect(configurationService.setDefaultPlayerSkill).toHaveBeenCalledWith(
    //     defaultPlayerSkill,
    //   );
    // });
  });

  describe('#getWhitelistId()', () => {
    let whitelistId: WhitelistId;

    beforeEach(() => {
      whitelistId = new WhitelistId('etf2l_6v6');
      configurationService.getWhitelistId.mockResolvedValue(whitelistId);
    });

    it('should return the whitelist id', async () => {
      expect(await controller.getWhitelistId()).toEqual(whitelistId);
    });
  });

  // describe('#setWhitelistId()', () => {
  //   beforeEach(() => {
  //     configurationService.setWhitelistId.mockResolvedValue('etf2l_6v6');
  //   });

  //   it('should set the whitelist id', async () => {
  //     const ret = await controller.setWhitelistId(new WhitelistId('etf2l_6v6'));
  //     expect(ret).toEqual(new WhitelistId('etf2l_6v6'));
  //     expect(configurationService.setWhitelistId).toHaveBeenCalledWith(
  //       'etf2l_6v6',
  //     );
  //   });
  // });

  describe('#isEtf2lAccountRequired()', () => {
    let etf2lAccountRequired: Etf2lAccountRequired;

    beforeEach(() => {
      etf2lAccountRequired = new Etf2lAccountRequired(true);
      configurationService.isEtf2lAccountRequired.mockResolvedValue(
        etf2lAccountRequired,
      );
    });

    it('should return the value', async () => {
      expect(await controller.isEtf2lAccountRequired()).toEqual(
        etf2lAccountRequired,
      );
    });
  });

  // describe('#setEtf2lAccountRequired()', () => {
  //   beforeEach(() => {
  //     configurationService.setEtf2lAccountRequired.mockResolvedValue(false);
  //   });

  //   it('should set the value', async () => {
  //     const ret = await controller.setEtf2lAccountRequired(
  //       new Etf2lAccountRequired(false),
  //     );
  //     expect(ret).toEqual(new Etf2lAccountRequired(false));
  //     expect(configurationService.setEtf2lAccountRequired).toHaveBeenCalledWith(
  //       false,
  //     );
  //   });
  // });

  describe('#getMinimumTf2InGameHours()', () => {
    let minimumTf2InGameHours: MinimumTf2InGameHours;

    beforeEach(() => {
      minimumTf2InGameHours = new MinimumTf2InGameHours(500);
      configurationService.getMinimumTf2InGameHours.mockResolvedValue(
        minimumTf2InGameHours,
      );
    });

    it('should return the value', async () => {
      expect(await controller.getMinimumTf2InGameHours()).toEqual(
        minimumTf2InGameHours,
      );
    });
  });

  // describe('#setMinimumTf2InGameHours()', () => {
  //   beforeEach(() => {
  //     configurationService.setMinimumTf2InGameHours.mockResolvedValue(1000);
  //   });

  //   it('should set the value', async () => {
  //     const ret = await controller.setMinimumTf2InGameHours(
  //       new MinimumTf2InGameHours(1000),
  //     );
  //     expect(ret).toEqual(new MinimumTf2InGameHours(1000));
  //     expect(
  //       configurationService.setMinimumTf2InGameHours,
  //     ).toHaveBeenCalledWith(1000);
  //   });
  // });

  describe('#getVoiceServer()', () => {
    let voiceServer: VoiceServer;

    beforeEach(() => {
      voiceServer = new VoiceServer();
      configurationService.getVoiceServer.mockResolvedValue(voiceServer);
    });

    it('should return the value', async () => {
      expect(await controller.getVoiceServer()).toEqual(voiceServer);
    });
  });

  // describe('#setVoiceServer', () => {
  //   beforeEach(() => {
  //     configurationService.setVoiceServer.mockImplementation((value) =>
  //       Promise.resolve(value),
  //     );
  //   });

  //   it('should set the voice server config', async () => {
  //     const voiceServer: MumbleOptions = {
  //       type: 'mumble',
  //       url: 'mumble.melkor.tf',
  //       port: 64738,
  //     };
  //     const ret = await controller.setVoiceServer(new VoiceServer(voiceServer));
  //     expect(configurationService.setVoiceServer).toHaveBeenCalledWith(
  //       voiceServer,
  //     );
  //     expect(ret).toEqual(new VoiceServer(voiceServer));
  //   });
  // });
});
