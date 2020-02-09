import { Test, TestingModule } from '@nestjs/testing';
import { OnlinePlayersService } from './online-players.service';
import { PlayersGateway } from '../gateways/players.gateway';
import { Subject } from 'rxjs';

class PlayersGatewayStub {
  playerConnected = new Subject<any>();
  playerDisconnected = new Subject<any>();
}

jest.useFakeTimers();

describe('OnlinePlayersService', () => {
  let service: OnlinePlayersService;
  let playersGateway: PlayersGatewayStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlinePlayersService,
        { provide: PlayersGateway, useClass: PlayersGatewayStub },
      ],
    }).compile();

    service = module.get<OnlinePlayersService>(OnlinePlayersService);
    playersGateway = module.get(PlayersGateway);
  });

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle player connections and disconnections properly', done => {
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

    const socket = { id: 'asdjklhuger', request: { user: { logged_in: true, id: 'FAKE_ID' } } };
    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([ socket ] as any);

    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([ socket ] as any);

    playersGateway.playerDisconnected.next(socket);
    expect(service.getSocketsForPlayer('FAKE_ID')).toEqual([]);

    service.playerLeft.subscribe(playerId => {
      expect(playerId).toEqual('FAKE_ID');
      done();
    });

    jest.runAllTimers();
  });
});
