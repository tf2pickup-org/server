import { Test, TestingModule } from '@nestjs/testing';
import { OnlinePlayersService } from './online-players.service';
import { PlayersGateway } from '../gateways/players.gateway';
import { Subject } from 'rxjs';
import { Events } from '@/events/events';

class PlayersGatewayStub {
  playerConnected = new Subject<any>();
  playerDisconnected = new Subject<any>();
}

describe('OnlinePlayersService', () => {
  let service: OnlinePlayersService;
  let playersGateway: PlayersGatewayStub;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlinePlayersService,
        { provide: PlayersGateway, useClass: PlayersGatewayStub },
        Events,
      ],
    }).compile();

    service = module.get<OnlinePlayersService>(OnlinePlayersService);
    playersGateway = module.get(PlayersGateway);
    events = module.get(Events);
  });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle player connections and disconnections properly', async () => new Promise<void>(resolve => {
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

    const socket = { id: 'FAKE_SOCKET_ID', request: { user: { logged_in: true, _id: 'FAKE_ID' } } };
    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([ socket ] as any);

    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([ socket ] as any);

    playersGateway.playerDisconnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

    events.playerDisconnects.subscribe(({ playerId }) => {
      expect(playerId).toEqual('FAKE_ID');
      resolve();
    });

    jest.runAllTimers();
  }));
});
