import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfController } from './serveme-tf.controller';
import { Client, ServerId } from '@tf2pickup-org/serveme-tf-client';
import { SERVEME_TF_CLIENT } from '../serveme-tf-client.token';

describe('ServemeTfController', () => {
  let controller: ServemeTfController;
  let servemeTfClient: jest.Mocked<Client>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServemeTfController],
      providers: [
        {
          provide: SERVEME_TF_CLIENT,
          useValue: {
            findOptions: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ServemeTfController>(ServemeTfController);
    servemeTfClient = module.get(SERVEME_TF_CLIENT);
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
      servemeTfClient.findOptions.mockResolvedValue({
        servers: [
          {
            id: 9118 as ServerId,
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
            id: 9128 as ServerId,
            name: 'NewBrigade #11',
            flag: 'de',
            ip: 'new.fakkelbrigade.eu',
            port: '27115',
            ip_and_port: 'new.fakkelbrigade.eu:27115',
            sdr: false,
            latitude: 51.2993,
            longitude: 9.491,
          },
        ],
        serverConfigs: [],
        whitelists: [],
      });
    });

    it('should return all available servers', async () => {
      const ret = await controller.listAllServers();
      expect(ret.length).toBe(2);
      expect(servemeTfClient.findOptions).toHaveBeenCalledTimes(1);
    });
  });
});
