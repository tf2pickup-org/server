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

  describe('when player connects', () => {
    let socket: Socket;

    beforeEach(() => {
      socket = {
        id: 'FAKE_SOCKET_1',
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
    });

    it('should mark the player as online', () => {
      expect(service.getSocketsForPlayer('FAKE_ID').length).toBe(1);
      expect(service.onlinePlayers.includes('FAKE_ID')).toBe(true);
    });

    describe('and then disconnects', () => {
      beforeEach(() => {
        playersGateway.playerDisconnected.next(socket);
        jest.runAllTimers();
      });

      it('should mark the player as offline', () => {
        expect(service.getSocketsForPlayer('FAKE_ID').length).toBe(0);
        expect(service.onlinePlayers.includes('FAKE_ID')).toBe(false);
      });
    });

    describe('and then connects from another IP address', () => {
      let socket2: Socket;

      beforeEach(() => {
        socket2 = {
          id: 'FAKE_SOCKET_1',
          user: { id: 'FAKE_ID' },
          conn: {
            remoteAddress: '192.168.0.1',
          },
          handshake: {
            address: '192.168.0.1',
            headers: {
              'user-agent': 'JUST_TESTING',
            },
          },
        } as Socket;
        playersGateway.playerConnected.next(socket2);
      });

      it('should mark the player as online', () => {
        expect(service.getSocketsForPlayer('FAKE_ID').length).toBe(2);
        expect(service.onlinePlayers.includes('FAKE_ID')).toBe(true);
      });

      describe('and then disconnects', () => {
        beforeEach(() => {
          playersGateway.playerDisconnected.next(socket2);
          jest.runAllTimers();
        });

        it('should still keep the player marked as online', () => {
          expect(service.getSocketsForPlayer('FAKE_ID').length).toBe(1);
          expect(service.onlinePlayers.includes('FAKE_ID')).toBe(true);
        });
      });
    });
  });
});
