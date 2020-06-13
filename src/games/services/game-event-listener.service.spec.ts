import { Test, TestingModule } from '@nestjs/testing';
import { GameEventListenerService } from './game-event-listener.service';
import { Environment } from '@/environment/environment';
import { GameEventHandlerService } from './game-event-handler.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GamesService } from './games.service';
import { LogReceiver } from 'srcds-log-receiver';
import { EventEmitter } from 'events';

jest.mock('./game-event-handler.service');

class EnvironmentStub {
  logRelayAddress = '0.0.0.0';
  logRelayPort = '1234';
}

class GameServersServiceStub {
  mockGameServer = {
    id: 'FAKE_GAME_SERVER_ID',
    name: 'FAKE_GAME_SERVER',
    game: 'FAKE_GAME_ID',
  };

  getGameServerByEventSource(eventSource: any) { return Promise.resolve(this.mockGameServer); }
}

class GamesServiceStub {
  mockGame = {
    id: 'FAKE_GAME_ID',
    number: 1,
  };

  getById(gameId: string) { return Promise.resolve(this.mockGame); }
  findByAssignedGameServer(gameServerId: string) { return Promise.resolve(this.mockGame); }
}

class LogReceiverStub extends EventEmitter {
  opts = {
    address: '127.0.0.1',
    port: 1234,
  };

  mockEvent(message: string) {
    this.emit('data', {
      isValid: true,
      receivedFrom: {
        address: '127.0.0.1',
        port: 1234,
      },
      message,
    });
  }
}

describe('GameEventListenerService', () => {
  let service: GameEventListenerService;
  let gameEventHandlerService: GameEventHandlerService;
  let logReceiver: LogReceiverStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEventListenerService,
        { provide: Environment, useClass: EnvironmentStub },
        GameEventHandlerService,
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: LogReceiver, useClass: LogReceiverStub },
      ],
    }).compile();

    service = module.get<GameEventListenerService>(GameEventListenerService);
    gameEventHandlerService = module.get(GameEventHandlerService);
    logReceiver = module.get(LogReceiver);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('should handle game events', () => {
    it('match started', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onMatchStarted');
      logReceiver.mockEvent('01/26/2020 - 20:40:20: World triggered "Round_Start"');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
        done();
      });
    });

    it('match ended', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onMatchEnded');
      logReceiver.mockEvent('01/26/2020 - 20:38:49: World triggered "Game_Over" reason "Reached Time Limit"');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
        done();
      }, 0);
    });

    it('logs uploaded', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onLogsUploaded');
      logReceiver.mockEvent('01/26/2020 - 20:38:52: [TFTrue] The log is available here: http://logs.tf/2458457. Type !log to view it.');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'http://logs.tf/2458457');
        done();
      }, 0);
    });

    it('player connected', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onPlayerJoining');
      logReceiver.mockEvent('01/26/2020 - 20:03:44: "mały #tf2pickup.pl<366><[U:1:114143419]><>" connected, address "83.29.150.132:27005"');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', '76561198074409147');
        done();
      }, 0);
    });

    it('player joined team', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onPlayerConnected');
      logReceiver.mockEvent('01/26/2020 - 20:03:51: "maly<366><[U:1:114143419]><Unassigned>" joined team "Blue"');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', '76561198074409147');
        done();
      }, 0);
    });

    it('player disconnected', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onPlayerDisconnected');
      logReceiver.mockEvent('01/26/2020 - 20:38:43: "maly<366><[U:1:114143419]><Blue>" disconnected (reason "Disconnect by user.")');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', '76561198074409147');
        done();
      }, 0);
    });

    it('score reported', done => {
      const spy = jest.spyOn(gameEventHandlerService, 'onScoreReported');
      logReceiver.mockEvent('01/26/2020 - 20:38:49: Team "Blue" final score "2" with "3" players');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'Blue', '2');
        done();
      }, 0);
    });
  });

  it('should discard invalid messages', done => {
    const spy = jest.spyOn(gameEventHandlerService, 'onMatchStarted');
    logReceiver.emit('data', {
      isValid: false,
      receivedFrom: {
        address: '127.0.0.1',
        port: 1234,
      },
      message: '01/26/2020 - 20:40:20: World triggered "Round_Start"',
    });

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      done();
    }, 0);
  });
});
