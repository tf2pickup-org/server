import { Environment } from '@/environment/environment';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ServemeTfApiService } from './serveme-tf-api.service';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';

jest.mock('@nestjs/axios');
jest.mock('./serveme-tf-configuration.service');

const environmentStub = {
  servemeTfApiEndpoint: 'serveme.tf',
  servemeTfApiKey: 'SERVEME_TF_FAKE_API_KEY',
};

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('ServemeTfApiService', () => {
  let service: ServemeTfApiService;
  let httpService: jest.Mocked<HttpService>;
  let servemeTfConfigurationService: jest.Mocked<ServemeTfConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServemeTfApiService,
        HttpService,
        {
          provide: Environment,
          useValue: environmentStub,
        },
        ServemeTfConfigurationService,
      ],
    }).compile();

    service = module.get<ServemeTfApiService>(ServemeTfApiService);
    httpService = module.get(HttpService);
    servemeTfConfigurationService = module.get(ServemeTfConfigurationService);

    servemeTfConfigurationService.getPreferredRegion.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#reserveServer()', () => {
    beforeEach(() => {
      httpService.get.mockReturnValue(
        of({
          status: 200,
          data: {
            actions: {
              find_servers: 'FIND_SERVERS_FAKE_URL',
            },
          },
        } as any),
      );
      httpService.post.mockImplementation((url) => {
        switch (url) {
          case 'FIND_SERVERS_FAKE_URL':
            return of({
              status: 200,
              data: {
                actions: {
                  create: 'CREATE_RESERVATION_FAKE_URL',
                },
                reservation: {
                  starts_at: new Date().toString(),
                  ends_at: new Date(Date.now() + 60 * 60 * 1000).toString(),
                  rcon: 'FAKE_RCON_PASSWORD',
                  password: 'FAKE_PASSWORD',
                },
                servers: [
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
                    id: 299,
                    name: 'BolusBrigade #04',
                    flag: 'nl',
                    ip: 'bolus.fakkelbrigade.eu',
                    port: '27045',
                    ip_and_port: 'bolus.fakkelbrigade.eu:27045',
                    sdr: false,
                    latitude: 52.3824,
                    longitude: 4.8995,
                  },
                ],
                server_configs: [],
                whitelists: [],
              },
            } as any);

          case 'CREATE_RESERVATION_FAKE_URL':
            return of({
              status: 200,
              data: {
                reservation: {
                  server: {
                    name: 'FAKE_SERVER_NAME',
                  },
                },
                actions: {},
              },
            });

          default:
            throw new Error('wrong url');
        }
      });
    });

    it('should make a reservation', async () => {
      const reservation = await service.reserveServer();
      expect(reservation).toBeTruthy();
    });

    describe('when the preferred region is specified', () => {
      describe('and a server in the requested region is available', () => {
        beforeEach(() => {
          servemeTfConfigurationService.getPreferredRegion.mockResolvedValue(
            'nl',
          );
        });

        it('should pick the server that is in the preferred region', async () => {
          await service.reserveServer();
          expect(httpService.post).toHaveBeenCalledWith(
            'CREATE_RESERVATION_FAKE_URL',
            {
              reservation: expect.objectContaining({
                server_id: 299,
              }),
            },
            expect.any(Object),
          );
        });
      });

      describe('and a server in the requested region is not available', () => {
        beforeEach(() => {
          servemeTfConfigurationService.getPreferredRegion.mockResolvedValue(
            'fr',
          );
        });

        it('should pick the a server randomly', async () => {
          const reservation = await service.reserveServer();
          expect(reservation).toBeTruthy();
        });
      });
    });
  });

  describe('#waitForServerToStart()', () => {
    let status: string;

    beforeEach(() => {
      status = 'Waiting to start';

      httpService.get.mockImplementation(() =>
        of({
          data: {
            reservation: {
              status,
            },
          },
        } as any),
      );

      jest.useFakeTimers('legacy');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait for the server to change the status to "Ready"', async () => {
      let resolved = false;
      service.waitForServerToStart(1).then(() => (resolved = true));

      expect(resolved).toBe(false);
      jest.advanceTimersByTime(1000);
      await flushPromises();
      expect(resolved).toBe(false);

      status = 'Ready';
      jest.advanceTimersByTime(1000);
      await flushPromises();
      expect(resolved).toBe(true);
    });
  });

  describe('#endServerReservation()', () => {
    describe('when the reservation is not ended', () => {
      beforeEach(() => {
        httpService.get.mockImplementation(() =>
          of({
            data: {
              reservation: {
                id: 5,
                ended: false,
                server: {
                  name: 'FAKE_SERVER_NAME',
                },
              },
              actions: {
                delete: 'DELETE_RESERVATION_FAKE_URL',
              },
            },
          } as any),
        );

        httpService.delete.mockImplementation(() =>
          of({
            data: {
              reservation: {
                id: 5,
                ended: true,
                server: {
                  name: 'FAKE_SERVER_NAME',
                },
              },
            },
          } as any),
        );
      });

      it('should call the api to end the reservation', async () => {
        const ret = await service.endServerReservation(5);
        expect(httpService.get).toHaveBeenCalledTimes(1);
        expect(httpService.delete).toHaveBeenCalledWith(
          'DELETE_RESERVATION_FAKE_URL',
          expect.any(Object),
        );
        expect(ret.reservation.server.name).toEqual('FAKE_SERVER_NAME');
      });
    });

    describe('when the reservation is already ended', () => {
      beforeEach(() => {
        httpService.get.mockImplementation(() =>
          of({
            data: {
              reservation: {
                id: 5,
                ended: true,
                server: {
                  name: 'FAKE_SERVER_NAME',
                },
              },
            },
          } as any),
        );
      });

      it('should not call the api', async () => {
        const ret = await service.endServerReservation(5);
        expect(httpService.delete).not.toHaveBeenCalled();
        expect(ret.reservation.server.name).toEqual('FAKE_SERVER_NAME');
      });
    });
  });

  describe('#listServers()', () => {
    const servers = [
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
        id: 299,
        name: 'BolusBrigade #04',
        flag: 'nl',
        ip: 'bolus.fakkelbrigade.eu',
        port: '27045',
        ip_and_port: 'bolus.fakkelbrigade.eu:27045',
        sdr: false,
        latitude: 52.3824,
        longitude: 4.8995,
      },
    ];

    beforeEach(() => {
      httpService.get.mockReturnValue(
        of({
          status: 200,
          data: {
            actions: {
              find_servers: 'FIND_SERVERS_FAKE_URL',
            },
          },
        } as any),
      );
      httpService.post.mockImplementation((url) => {
        switch (url) {
          case 'FIND_SERVERS_FAKE_URL':
            return of({
              status: 200,
              data: {
                actions: {
                  create: 'CREATE_RESERVATION_FAKE_URL',
                },
                reservation: {
                  starts_at: new Date().toString(),
                  ends_at: new Date(Date.now() + 60 * 60 * 1000).toString(),
                  rcon: 'FAKE_RCON_PASSWORD',
                  password: 'FAKE_PASSWORD',
                },
                servers,
                server_configs: [],
                whitelists: [],
              },
            } as any);

          default:
            throw new Error('wrong url');
        }
      });
    });

    it('should return all available options', async () => {
      const ret = await service.listServers();
      expect(ret).toEqual(servers);
    });
  });
});
