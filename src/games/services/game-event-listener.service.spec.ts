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

  getGameServerByEventSource(eventSource: any) {
    return Promise.resolve(this.mockGameServer);
  }
}

class GamesServiceStub {
  mockGame = {
    id: 'FAKE_GAME_ID',
    number: 1,
  };

  getById(gameId: string) {
    return Promise.resolve(this.mockGame);
  }
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
    it('match started', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onMatchStarted');
        logReceiver.mockEvent(
          '01/26/2020 - 20:40:20: World triggered "Round_Start"',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
          resolve();
        });
      }));

    it('match ended', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onMatchEnded');
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:49: World triggered "Game_Over" reason "Reached Time Limit"',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
          resolve();
        }, 0);
      }));

    it('logs uploaded', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onLogsUploaded');
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:52: [TFTrue] The log is available here: http://logs.tf/2458457. Type !log to view it.',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith(
            'FAKE_GAME_ID',
            'http://logs.tf/2458457',
          );
          resolve();
        }, 0);
      }));

    it('demo uploaded', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onDemoUploaded');
        logReceiver.mockEvent(
          '06/19/2020 - 00:04:28: [demos.tf]: STV available at: https://demos.tf/427407',
        );
        setTimeout(() => {
          expect(spy).toBeCalledWith('FAKE_GAME_ID', 'https://demos.tf/427407');
          resolve();
        }, 0);
      }));

    it('player connected', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onPlayerJoining');
        logReceiver.mockEvent(
          '01/26/2020 - 20:03:44: "mały #tf2pickup.pl<366><[U:1:114143419]><>" connected, address "83.29.150.132:27005"',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', '76561198074409147');
          resolve();
        }, 0);
      }));

    it('player joined team', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onPlayerConnected');
        logReceiver.mockEvent(
          '01/26/2020 - 20:03:51: "maly<366><[U:1:114143419]><Unassigned>" joined team "Blue"',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', '76561198074409147');
          resolve();
        }, 0);
      }));

    it('player disconnected', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onPlayerDisconnected');
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:43: "maly<366><[U:1:114143419]><Blue>" disconnected (reason "Disconnect by user.")',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', '76561198074409147');
          resolve();
        }, 0);
      }));

    it('score reported', async () =>
      new Promise<void>((resolve) => {
        const spy = jest.spyOn(gameEventHandlerService, 'onScoreReported');
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:49: Team "Blue" final score "2" with "3" players',
        );
        setTimeout(() => {
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'Blue', '2');
          resolve();
        }, 0);
      }));
  });

  it('should discard invalid messages', async () =>
    new Promise<void>((resolve) => {
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
        resolve();
      }, 0);
    }));
});
