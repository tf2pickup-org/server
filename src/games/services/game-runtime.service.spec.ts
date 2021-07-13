import { Test, TestingModule } from '@nestjs/testing';
import { GameRuntimeService } from './game-runtime.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { RconFactoryService } from './rcon-factory.service';
import { PlayersService } from '@/players/services/players.service';
import { say } from '../utils/rcon-commands';
import { Tf2Team } from '../models/tf2-team';
import { ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { Game, GameDocument, gameSchema } from '../models/game';
import { GameServer } from '@/game-servers/models/game-server';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MongooseModule } from '@nestjs/mongoose';

jest.mock('./games.service');
jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./server-configurator.service');
jest.mock('./rcon-factory.service');
jest.mock('@/players/services/players.service');

class RconStub {
  send(cmd: string) {
    return Promise.resolve();
  }
  end() {
    return Promise.resolve();
  }
}

describe('GameRuntimeService', () => {
  let service: GameRuntimeService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let gamesService: GamesService;
  let gameServersService: jest.Mocked<GameServersService>;
  let serverConfiguratorService: ServerConfiguratorService;
  let rconFactoryService: RconFactoryService;
  let mockGameServer: GameServer & { id: string };
  let mockPlayers: PlayerDocument[];
  let mockGame: GameDocument;
  let events: Events;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          { name: Player.name, schema: playerSchema },
        ]),
      ],
      providers: [
        GameRuntimeService,
        GamesService,
        GameServersService,
        ServerConfiguratorService,
        RconFactoryService,
        PlayersService,
        Events,
      ],
    }).compile();

    service = module.get<GameRuntimeService>(GameRuntimeService);
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
    rconFactoryService = module.get(RconFactoryService);
    events = module.get(Events);
  });

  beforeEach(async () => {
    mockGameServer = {
      id: new ObjectId().toString(),
      name: 'FAKE_GAME_SERVER',
      address: 'FAKE_ADDRESS',
      port: '1234',
      rconPassword: 'FAKE_RCON_PASSWORD',
    };

    gameServersService.getById.mockResolvedValue(mockGameServer as any);

    mockPlayers = await Promise.all([
      // @ts-expect-error
      playersService._createOne(),
      // @ts-expect-error
      playersService._createOne(),
    ]);

    // @ts-expect-error
    mockGame = await gamesService._createOne(mockPlayers);

    mockGame.gameServer = new ObjectId(mockGameServer.id);
    await mockGame.save();

    serverConfiguratorService.configureServer = () =>
      Promise.resolve({
        connectString: 'FAKE_CONNECT_STRING',
        stvConnectString: 'FAKE_STV_CONNECT_STRING',
      });
  });

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#reconfigure()', () => {
    it('should configure the server again', async () => {
      const spy = jest.spyOn(serverConfiguratorService, 'configureServer');
      const ret = await service.reconfigure(mockGame.id);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockGameServer.id }),
        expect.objectContaining({ id: mockGame.id }),
      );
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
    });

    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.reconfigure(new ObjectId().toString()),
        ).rejects.toThrowError('no such game');
      });
    });

    describe('when the game has no game server assigned', () => {
      let anotherGame: GameDocument;

      beforeEach(async () => {
        // @ts-expect-error
        anotherGame = await gamesService._createOne(mockPlayers);
      });

      it('should throw an error', async () => {
        await expect(service.reconfigure(anotherGame.id)).rejects.toThrowError(
          'this game has no server assigned',
        );
      });
    });

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        serverConfiguratorService.configureServer = () =>
          Promise.reject('FAKE_RCON_ERROR');
      });

      it('should handle the error', async () => {
        await expect(service.reconfigure(mockGame.id)).resolves.toBeTruthy();
      });
    });
  });

  describe('#forceEnd()', () => {
    it('should set the game state', async () => {
      const ret = await service.forceEnd(mockGame.id);
      expect(ret.state).toEqual('interrupted');
      expect(ret.error).toEqual('ended by admin');
    });

    it('should clean up the game server', async () => {
      const cleanupSpy = jest.spyOn(serverConfiguratorService, 'cleanupServer');
      const releaseSpy = jest.spyOn(gameServersService, 'releaseServer');
      await service.forceEnd(mockGame.id);
      expect(cleanupSpy).toHaveBeenCalledWith(mockGameServer);
      expect(releaseSpy).toHaveBeenCalledWith(mockGameServer.id);
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game, adminId }) => {
          expect(game.id).toEqual(mockGame.id);
          expect(adminId).toEqual('FAKE_ADMIN_ID');
          resolve();
        });

        service.forceEnd(mockGame.id, 'FAKE_ADMIN_ID');
      }));

    // eslint-disable-next-line jest/expect-expect
    it('should emit the substituteRequestsChange event', async () =>
      new Promise<void>((resolve) => {
        events.substituteRequestsChange.subscribe(resolve);
        service.forceEnd(mockGame.id);
      }));

    describe('when the given game does not exist', () => {
      it('should reject', async () => {
        await expect(
          service.forceEnd(new ObjectId().toString()),
        ).rejects.toThrowError('no such game');
      });
    });

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        serverConfiguratorService.configureServer = () =>
          Promise.reject('FAKE_RCON_ERROR');
      });

      it('should handle the error', async () => {
        await expect(service.forceEnd(mockGame.id)).resolves.toBeTruthy();
      });
    });

    describe('if one of the players is waiting to be substituted', () => {
      beforeEach(async () => {
        mockGame.slots[0].status = SlotStatus.waitingForSubstitute;
        await mockGame.save();
      });

      it('should set his status back to active', async () => {
        const ret = await service.forceEnd(mockGame.id);
        expect(ret.slots[0].status).toEqual(SlotStatus.active);
      });
    });
  });

  describe('#replacePlayer()', () => {
    let rcon: RconStub;

    beforeEach(() => {
      rcon = new RconStub();
      // @ts-expect-error
      rconFactoryService.createRcon = () => Promise.resolve(rcon);
    });

    describe('when the given game does not exist', () => {
      beforeEach(() => {
        jest.spyOn(gamesService, 'getById').mockResolvedValue(null);
      });

      it('should throw an error', async () => {
        await expect(
          service.replacePlayer('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', null),
        ).rejects.toThrowError('no such game');
      });
    });

    describe('when the given game has no game server assigned', () => {
      let anotherGame: GameDocument;

      beforeEach(async () => {
        // @ts-expect-error
        anotherGame = await gamesService._createOne(mockPlayers);
      });

      it('should throw an error', async () => {
        await expect(
          service.replacePlayer(
            anotherGame.id,
            mockPlayers[0].id,
            mockPlayers[1].id,
          ),
        ).rejects.toThrowError('this game has no server assigned');
      });
    });

    it.todo('should execute the correct commands');

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        rcon.send = () => Promise.reject('fake rcon error');
      });

      it('should close the RCON connection', async () => {
        const spy = jest.spyOn(rcon, 'end');
        await service.replacePlayer(mockGame.id, mockPlayers[0].id, {
          player: new ObjectId(),
          team: Tf2Team.red,
          gameClass: Tf2ClassName.soldier,
        });
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should close the RCON connection', async () => {
      const spy = jest.spyOn(rcon, 'end');
      await service.replacePlayer(mockGame.id, mockPlayers[0].id, {
        player: new ObjectId(),
        team: Tf2Team.red,
        gameClass: Tf2ClassName.soldier,
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#sayChat()', () => {
    let rcon: RconStub;

    beforeEach(() => {
      rcon = new RconStub();
      // @ts-expect-error
      rconFactoryService.createRcon = () => Promise.resolve(rcon);
    });

    describe('when the given game server does not exist', () => {
      beforeEach(() => {
        gameServersService.getById.mockResolvedValue(null);
      });

      it('should throw an error', async () => {
        await expect(
          service.sayChat(mockGameServer.id, 'some message'),
        ).rejects.toThrowError('game server does not exist');
      });
    });

    it('should execute the correct commands', async () => {
      const spy = jest.spyOn(rcon, 'send');
      await service.sayChat(mockGameServer.id, 'some message');
      expect(spy).toHaveBeenCalledWith(say('some message'));
    });

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        rcon.send = () => Promise.reject('fake rcon error');
      });

      it('should close the RCON connection', async () => {
        const spy = jest.spyOn(rcon, 'end');
        await service.sayChat(mockGameServer.id, 'some message');
        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
