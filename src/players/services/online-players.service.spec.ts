import { Test, TestingModule } from '@nestjs/testing';
import { OnlinePlayersService } from './online-players.service';
import { PlayersGateway } from '../gateways/players.gateway';
import { Subject } from 'rxjs';
import { ObjectId } from 'mongodb';

class PlayersGatewayStub {
  playerConnected = new Subject<any>();
  playerDisconnected = new Subject<any>();
}

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

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle player connections and disconnections properly', done => {
    expect(service.getSocketsForPlayer(new ObjectId())).toEqual([]);

    const playerId = new ObjectId();
    const socket = { id: 'asdjklhuger', request: { user: { logged_in: true, id: playerId } } };
    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer(playerId)).toEqual([ socket ] as any);

    playersGateway.playerConnected.next(socket);
    expect(service.getSocketsForPlayer(playerId)).toEqual([ socket ] as any);

    playersGateway.playerDisconnected.next(socket);
    expect(service.getSocketsForPlayer(playerId)).toEqual([]);

    service.playerLeft.subscribe(_playerId => {
      expect(_playerId).toEqual(playerId);
      done();
    });

    jest.runAllTimers();
  });
});
