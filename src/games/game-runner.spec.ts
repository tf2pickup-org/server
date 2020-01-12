import { GameRunner } from './game-runner';
import { GameServer } from '@/game-servers/models/game-server';

const makeGame = () => ({
  id: 'FAKE_GAME_ID',
  number: 1,
  map: 'cp_badlands',
  state: 'launching',
  save: () => null,
  slots: [
    { playerId: 'FAKE_PLAYER_ID_1', connectionStatus: 'offline' },
    { playerId: 'FAKE_PLAYER_ID_2', connectionStatus: 'joining' },
  ],
});

const makeGameServer = () => ({
  id: 'FAKE_GAME_SERVER_ID',
  name: 'some game server',
  address: 'localhost',
  port: '27015',
  rconPassword: '123456',
  mumbleChannelName: 'FAKE_GAME_SERVER_MUMBLE_CHANNEL_NAME',
});

class GamesServiceStub {
  getById(gameId: string) { return makeGame(); }
}

class GameServersServiceStub {
  findFreeGameServer() { return null; }
  getById(gameServerId: string) { return makeGameServer(); }
  takeServer(gameServerId: string) { return null; }
  releaseServer(gameServerId: string) { return null; }
}

class EnvironmentStub {
  mumbleServerUrl = 'FAKE_MUMBLE_SERVER_URL';
  mumbleChannelName = 'FAKE_MUMBLE_CHANNEL_NAME';
}

class ServerConfiguratorServiceStub {
  configureServer(gameServer: any, game: any) { return { connectString: 'FAKE_CONNECT_STRING' }; }
  cleanupServer(gameServer: any) { return null; }
}

class PlayersServiceStub {
  findBySteamId(steamId: string) { return { id: 'FAKE_PLAYER_ID_1' }; }
  getById(id: string) { return { id: 'FAKE_PLAYER_ID', steamId: 'FAKE_STEAM_ID', name: 'FAKE_PLAYER_NAME' }; }
}

class RconStub {
  send(cmd: string) { return null; }
  end() { return null; }
}

class RconFactoryServiceStub {
  createRcon(gameServer: GameServer) { return new Promise(resolve => resolve(new RconStub())); }
}

describe('GameRunner', () => {
  let gameRunner: GameRunner;
  let gamesService: GamesServiceStub;
  let gameServersService: GameServersServiceStub;
  let environment: EnvironmentStub;
  let serverConfiguratorService: ServerConfiguratorServiceStub;
  let playersService: PlayersServiceStub;
  let rconFactoryService: RconFactoryServiceStub;

  beforeEach(() => {
    gamesService = new GamesServiceStub();
    gameServersService = new GameServersServiceStub();
    environment = new EnvironmentStub();
    serverConfiguratorService = new ServerConfiguratorServiceStub();
    playersService = new PlayersServiceStub();
    rconFactoryService = new RconFactoryServiceStub();

    gameRunner = new GameRunner(
      'FAKE_GAME_ID',
      gamesService as any,
      gameServersService as any,
      environment as any,
      serverConfiguratorService as any,
      playersService as any,
      rconFactoryService as any,
    );
  });

  it('should be defined', () => {
    expect(gameRunner).toBeDefined();
  });

  it('should store the game id', () => {
    expect(gameRunner.gameId).toEqual('FAKE_GAME_ID');
  });

  describe('#initialize()', () => {
    it('should fetch the given game', async () => {
      const spy = spyOn(gamesService, 'getById').and.callThrough();
      await gameRunner.initialize();
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });

    describe('with assigned server', () => {
      const _game = {
        ...makeGame(),
        gameServer: 'FAKE_GAME_SERVER_ID' as any,
      };

      beforeEach(() => {
        spyOn(gamesService, 'getById').and.returnValue(_game);
      });

      it('should fetch the given game sever', async () => {
        const spy = spyOn(gameServersService, 'getById').and.callThrough();
        await gameRunner.initialize();
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID');
      });

      it('should emit gameInitialized', async done => {
        gameRunner.gameInitialized.subscribe(done);
        await gameRunner.initialize();
      });

      it('should find another server if the assigned one does not exist', async () => {
        spyOn(gameServersService, 'getById').and.returnValue(null);
        const spy = spyOn(gameServersService, 'findFreeGameServer').and.callThrough();
        await gameRunner.initialize();
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('without assigned server', () => {
      it('should find free server', async () => {
        const spy = spyOn(gameServersService, 'findFreeGameServer').and.callThrough();
        await gameRunner.initialize();
        expect(spy).toHaveBeenCalled();
      });

      describe('with free servers available', () => {
        beforeEach(() => {
          spyOn(gameServersService, 'findFreeGameServer').and.returnValue(makeGameServer());
        });

        it('should assign game server', async () => {
          const spy = spyOn(gameServersService, 'takeServer').and.callThrough();
          await gameRunner.initialize();
          expect(gameRunner.game.gameServer).toEqual(makeGameServer());
          expect(spy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID');
        });

        it('should emit gameUpdated', done => {
          gameRunner.gameUpdated.subscribe(done);
          gameRunner.initialize();
        });

        it('should emit gameInitialized', done => {
          gameRunner.gameInitialized.subscribe(done);
          gameRunner.initialize();
        });
      });
    });
  });

  describe('#launch()', () => {
    it('should configure server and emit updates', async done => {
      gameRunner.gameUpdated.subscribe(done);

      const spy = spyOn(serverConfiguratorService, 'configureServer').and.callThrough();
      gameRunner.game = makeGame() as any;
      gameRunner.gameServer = makeGameServer() as any;

      await gameRunner.launch();
      expect(spy).toHaveBeenCalled();

      expect(gameRunner.game.connectString).toEqual('FAKE_CONNECT_STRING');
    });

    it('should throw an error if it is uninitialized', async () => {
      expectAsync(gameRunner.launch()).toBeRejectedWithError('not initialized');

      gameRunner.game = makeGame() as any;
      expectAsync(gameRunner.launch()).toBeRejectedWithError('not initialized');

      gameRunner.game = null;
      gameRunner.gameServer = makeGameServer() as any;
      expectAsync(gameRunner.launch()).toBeRejectedWithError('not initialized');
    });
  });

  describe('#forceEnd()', () => {
    it('should cleanup server', async () => {
      const spy1 = spyOn(gameServersService, 'releaseServer').and.callThrough();
      const spy2 = spyOn(serverConfiguratorService, 'cleanupServer').and.callThrough();

      gameRunner.game = makeGame() as any;
      gameRunner.gameServer = makeGameServer() as any;

      await gameRunner.forceEnd();

      expect(gameRunner.game.state).toEqual('interrupted');
      expect(gameRunner.game.error).toEqual('ended by admin');
      expect(spy1).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID');
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('#replacePlayer()', () => {
    it('should update the player slot', async () => {
      const rcon = new RconStub();
      const createSpy = spyOn(rconFactoryService, 'createRcon').and.returnValue(rcon as any);
      const sendSpy = spyOn(rcon, 'send');
      const endSpy = spyOn(rcon, 'end');

      gameRunner.game = makeGame() as any;
      await gameRunner.replacePlayer('FAKE_REPLACEE_ID', { playerId: 'FAKE_PLAYER_ID', gameClass: 'scout', teamId: '1' } as any);

      expect(createSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith('sm_game_player_add FAKE_STEAM_ID -name "FAKE_PLAYER_NAME" -team 3 -class scout');
      expect(sendSpy).toHaveBeenCalledWith('sm_game_player_del FAKE_STEAM_ID');
      expect(endSpy).toHaveBeenCalled();
    });
  });

  describe('#onPlayerJoining()', () => {
    it('should update player connection status and emit event', async done => {
      gameRunner.gameUpdated.subscribe(done);
      gameRunner.game = makeGame() as any;
      await gameRunner.onPlayerJoining('some steam id');
      expect(gameRunner.game.slots.find(s => s.playerId === 'FAKE_PLAYER_ID_1').connectionStatus).toEqual('joining');
    });
  });

  describe('#onPlayerConnected()', () => {
    it('should update player connection status and emit event', async done => {
      gameRunner.gameUpdated.subscribe(done);
      gameRunner.game = makeGame() as any;
      await gameRunner.onPlayerConnected('some steam id');
      expect(gameRunner.game.slots.find(s => s.playerId === 'FAKE_PLAYER_ID_1').connectionStatus).toEqual('connected');
    });
  });

  describe('#onMatchStarted()', () => {
    it('should change state and emit event', async done => {
      gameRunner.game = makeGame() as any;
      gameRunner.gameUpdated.subscribe(done);

      await gameRunner.onMatchStarted();
      expect(gameRunner.game.state).toEqual('started');
    });
  });

  describe('#onMatchEnded()', () => {
    it('should change state and emit event', async done => {
      gameRunner.game = makeGame() as any;
      gameRunner.gameUpdated.subscribe(done);

      await gameRunner.onMatchEnded();
      expect(gameRunner.game.state).toEqual('ended');
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should set logs url and emit event', async done => {
      gameRunner.game = makeGame() as any;
      gameRunner.gameUpdated.subscribe(done);

      await gameRunner.onLogsUploaded('FAKE_LOGS_URL');
      expect(gameRunner.game.logsUrl).toEqual('FAKE_LOGS_URL');
    });
  });
});
