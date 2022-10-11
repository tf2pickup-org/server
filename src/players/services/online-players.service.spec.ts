import { Test, TestingModule } from '@nestjs/testing';
import { OnlinePlayersService } from './online-players.service';
import { PlayersGateway } from '../gateways/players.gateway';
import { Events } from '@/events/events';
import { Subject } from 'rxjs';
import { Socket } from 'socket.io';

jest.mock('../gateways/players.gateway', () => ({
  PlayersGateway: jest.fn().mockImplementation(() => ({
    playerConnected: new Subject<Socket>(),
    playerDisconnected: new Subject<Socket>(),
  })),
}));

describe('OnlinePlayersService', () => {
  let service: OnlinePlayersService;
  let playersGateway: jest.Mocked<PlayersGateway> & {
    playerConnected: Subject<Socket>;
    playerDisconnected: Subject<Socket>;
  };
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnlinePlayersService, PlayersGateway, Events],
    }).compile();

    service = module.get<OnlinePlayersService>(OnlinePlayersService);
    playersGateway = module.get(PlayersGateway);
    events = module.get(Events);
  });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  beforeEach(() => service.onModuleInit());
  afterEach(() => service.onModuleDestroy());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle player connections and disconnections properly', () =>
    new Promise<void>((resolve) => {
      expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

      const socket = {
        id: 'FAKE_SOCKET_ID',
        user: { id: 'FAKE_ID' },
        conn: {
          remoteAddress: '127.0.0.1',
        },
        handshake: {
          address: '127.0.0.1',
          headers: {
            'user-agent': 'JUST_TESTING',
          },
        },
      } as Socket;
      playersGateway.playerConnected.next(socket);
      expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([socket]);
      expect(service.onlinePlayers.includes('FAKE_ID')).toBe(true);

      playersGateway.playerConnected.next(socket);
      expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([socket]);
      expect(service.onlinePlayers.includes('FAKE_ID')).toBe(true);

      playersGateway.playerDisconnected.next(socket);
      expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

      events.playerDisconnects.subscribe(({ playerId }) => {
        expect(playerId).toEqual('FAKE_ID');
        expect(service.onlinePlayers.includes('FAKE_ID')).toBe(false);
        resolve();
      });

      jest.runAllTimers();
    }));
});
