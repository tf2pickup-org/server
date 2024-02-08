import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { Player, playerSchema } from '@/players/models/player';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Game, gameSchema } from '../models/game';
import { QueueSlot } from '@/queue/types/queue-slot';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tf2Team } from '../models/tf2-team';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { GameState } from '../models/game-state';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Connection, Model, Types } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Mutex } from 'async-mutex';
import { GameServer } from '../models/game-server';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { GameEventType } from '../models/game-event-type';
import { PlayerId } from '@/players/types/player-id';
import { GameEnded, GameEndedReason } from '../models/events/game-ended';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { GAME_MODEL_MUTEX } from '../tokens/game-model-mutex.token';

jest.mock('@/players/services/players.service');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/game-servers/services/game-servers.service');

describe('GamesService', () => {
  let service: GamesService;
  let mongod: MongoMemoryServer;
  let gameModel: Model<Game>;
  let playersService: PlayersService;
  let events: Events;
  let configurationService: jest.Mocked<ConfigurationService>;
  let connection: Connection;
  let configuration: Record<string, unknown>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          { name: Player.name, schema: playerSchema },
        ]),
      ],
      providers: [
        {
          provide: GAME_MODEL_MUTEX,
          useValue: new Mutex(),
        },
        GamesService,
        PlayersService,
        Events,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameModel = module.get(getModelToken(Game.name));

    playersService = module.get(PlayersService);
    events = module.get(Events);
    configurationService = module.get(ConfigurationService);
    connection = module.get(getConnectionToken());
  });

  beforeEach(() => {
    configuration = {
      'games.default_player_skill': {
        [Tf2ClassName.scout]: 2,
        [Tf2ClassName.soldier]: 3,
        [Tf2ClassName.demoman]: 4,
        [Tf2ClassName.medic]: 5,
      },
    };

    configurationService.get.mockImplementation((key: string) =>
      Promise.resolve(configuration[key]),
    );
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await gameModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getGameCount()', () => {
    it('should return document count', async () => {
      const spy = jest.spyOn(gameModel, 'countDocuments');
      const ret = await service.getGameCount();
      expect(spy).toHaveBeenCalledWith({});
      expect(ret).toEqual(0);
    });

    it('should respect filters', async () => {
      const spy = jest.spyOn(gameModel, 'countDocuments');
      const ret = await service.getGameCount({ state: [GameState.ended] });
      expect(spy).toHaveBeenCalledWith({ state: [GameState.ended] });
      expect(ret).toEqual(0);
    });
  });

  describe('#getById()', () => {
    let game: Game;

    beforeEach(async () => {
      game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [],
      });
    });

    it('should get the game by its id', async () => {
      const ret = await service.getById(game._id);
      expect(ret.id).toEqual(game.id);
    });
  });

  describe('#getByNumber()', () => {
    let game: Game;

    beforeEach(async () => {
      game = await gameModel.create({
        number: 1025,
        map: 'cp_badlands',
      });
    });

    it('should get the game by its number', async () => {
      const ret = await service.getByNumber(1025);
      expect(ret.id).toEqual(game.id);
    });
  });

  describe('#getByLogSecret()', () => {
    let game: Game;

    beforeEach(async () => {
      game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [],
        logSecret: 'FAKE_LOG_SECRET',
      });
    });

    it('should get the game by its logsecret', async () => {
      const ret = await service.getByLogSecret('FAKE_LOG_SECRET');
      expect(ret.id).toEqual(game.id);
      expect(ret.logSecret).toBe('FAKE_LOG_SECRET');
    });
  });

  describe('#getRunningGames()', () => {
    let createdGame: Game;
    let launchingGame: Game;
    let runningGame: Game;
    let endedGame: Game;

    beforeEach(async () => {
      createdGame = await gameModel.create({
        number: 4,
        map: 'cp_badlands',
        state: GameState.created,
        slots: [],
      });
      launchingGame = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        state: GameState.launching,
        slots: [],
      });
      runningGame = await gameModel.create({
        number: 2,
        map: 'cp_badlands',
        state: GameState.started,
        slots: [],
      });
      endedGame = await gameModel.create({
        number: 3,
        map: 'cp_badlands',
        state: GameState.ended,
        slots: [],
      });
    });

    it('should get only running games', async () => {
      const ret = await service.getRunningGames();
      expect(ret.length).toEqual(3);
      expect(
        [createdGame.id, launchingGame.id, runningGame.id].every((id) =>
          ret.find((g) => g.id === id),
        ),
      ).toBe(true);
    });
  });

  describe('#getGames()', () => {
    beforeEach(async () => {
      await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        state: GameState.launching,
        slots: [],
      });
      await gameModel.create({
        number: 2,
        map: 'cp_badlands',
        state: GameState.launching,
        slots: [],
      });
    });

    it('should return games', async () => {
      const ret = await service.getGames();
      expect(ret.length).toEqual(2);
    });

    it('should honor limit', async () => {
      const ret = await service.getGames({}, { limit: 1 });
      expect(ret.length).toEqual(1);
    });

    it('should honor sort', async () => {
      const ret = await service.getGames({}, { sort: { 'events.0.at': 1 } });
      expect(ret[0].number).toBe(1);
      expect(ret[1].number).toBe(2);
    });
  });

  describe('#create()', () => {
    let slots: QueueSlot[];
    let playerWithSkill: Player;

    beforeEach(async () => {
      // @ts-expect-error
      playerWithSkill = await playersService._createOne();
      await playersService.updatePlayer(playerWithSkill._id, {
        skill: { [Tf2ClassName.scout]: 9 },
      });

      slots = [
        {
          id: 0,
          gameClass: Tf2ClassName.scout,
          playerId: playerWithSkill._id,
          ready: true,
          friend: null,
        },
        {
          id: 1,
          gameClass: Tf2ClassName.scout,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 2,
          gameClass: Tf2ClassName.scout,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 3,
          gameClass: Tf2ClassName.scout,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 4,
          gameClass: Tf2ClassName.soldier,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 5,
          gameClass: Tf2ClassName.soldier,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 6,
          gameClass: Tf2ClassName.soldier,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 7,
          gameClass: Tf2ClassName.soldier,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 8,
          gameClass: Tf2ClassName.demoman,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 9,
          gameClass: Tf2ClassName.demoman,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 10,
          gameClass: Tf2ClassName.medic,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
        {
          id: 11,
          gameClass: Tf2ClassName.medic,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
          ready: true,
          friend: null,
        },
      ] as any;
    });

    describe('when the queue is not full', () => {
      beforeEach(() => {
        slots[3].ready = false;
        slots[3].playerId = null;
      });

      it('should fail', async () => {
        await expect(service.create(slots, 'cp_fake')).rejects.toThrow(
          'queue not full',
        );
      });
    });

    it('should create a game', async () => {
      const game = await service.create(slots, 'cp_fake');
      expect(game.number).toEqual(1);
      expect(game.map).toEqual('cp_fake');
      expect(game.state).toEqual(GameState.created);
    });

    it('should emit the gameCreated event', async () => {
      let createdGame: Game | undefined;

      events.gameCreated.subscribe(({ game }) => {
        createdGame = game;
      });

      await service.create(slots, 'cp_fake');
      expect(createdGame).toMatchObject({
        number: 1,
        map: 'cp_fake',
        state: GameState.created,
      });
    });

    describe('when skill for a player is defined', () => {
      it('should record the given skill', async () => {
        const game = await service.create(slots, 'cp_fake');
        expect(game.assignedSkills?.get(`${slots[0].playerId}`)).toEqual(9);
      });
    });

    describe('when skill for the player is not defined', () => {
      it('should assign default skill', async () => {
        const game = await service.create(slots, 'cp_fake');
        expect(game.assignedSkills?.get(`${slots[1].playerId}`)).toEqual(2);
        expect(game.assignedSkills?.get(`${slots[4].playerId}`)).toEqual(3);
      });
    });

    it('should assign the very next number', async () => {
      const game1 = await service.create(slots, 'cp_fake_rc1');
      expect(game1.number).toEqual(1);
      const game2 = await service.create(slots, 'cp_fake_rc2');
      expect(game2.number).toEqual(2);
    });

    it('should assign the created game to each player', async () => {
      const spy = jest.spyOn(playersService, 'updatePlayer');
      const game = await service.create(slots, 'cp_fake_rc1');
      expect(spy).toHaveBeenCalledTimes(12);
      spy.mock.calls.forEach((call) =>
        expect(call[1].activeGame).toEqual(game.id),
      );
    });
  });

  describe('#forceEnd()', () => {
    let testGame: Game;
    let testPlayer: Player;

    beforeEach(async () => {
      // @ts-expect-error
      testPlayer = await playersService._createOne();

      testGame = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [
          {
            player: testPlayer._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
          },
        ],
      });

      await playersService.updatePlayer(testPlayer._id, {
        activeGame: testGame._id,
      });
    });

    it('should mark the game as forcefully ended', async () => {
      const game = await service.forceEnd(testGame._id);
      expect(game.state).toEqual(GameState.interrupted);
      expect(game.error).toEqual('ended by admin');
    });

    it('should unassign the game', async () => {
      await service.forceEnd(testGame._id);
      const player = await playersService.getById(testPlayer._id);
      expect(player.activeGame).toBeUndefined();
    });

    it('should register the ended event', async () => {
      const game = await service.forceEnd(testGame._id);
      expect(game.endedAt).toBeTruthy();
      const ended = game.events.find(
        ({ event }) => event === GameEventType.gameEnded,
      ) as GameEnded;
      expect(ended).toBeTruthy();
      expect(ended.reason).toBe(GameEndedReason.interrupted);
    });

    it('should emit an event', () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ oldGame, newGame }) => {
          expect(oldGame.id).toEqual(testGame.id);
          expect(newGame.id).toEqual(testGame.id);
          expect(newGame.state).toEqual(GameState.interrupted);
          resolve();
        });
        service.forceEnd(testGame._id);
      }));
  });

  describe('#getMostActivePlayers()', () => {
    let player1: Player;
    let player2: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player1 = await playersService._createOne();
      // @ts-expect-error
      player2 = await playersService._createOne();

      await gameModel.create({
        number: 1,
        slots: [
          {
            player: player1._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
          },
          {
            player: player2._id,
            team: Tf2Team.red,
            gameClass: Tf2ClassName.scout,
          },
        ],
        map: 'cp_badlands',
        state: GameState.ended,
      });

      await gameModel.create({
        number: 2,
        slots: [
          {
            player: player1._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
          },
        ],
        map: 'cp_badlands',
        state: GameState.ended,
      });
    });

    it('should return the most active players', async () => {
      const ret = await service.getMostActivePlayers();
      expect(ret).toEqual([
        { player: player1.id.toString(), count: 2 },
        { player: player2.id.toString(), count: 1 },
      ]);
    });
  });

  describe('#getMostActiveMedics()', () => {
    it.todo('should return the most active medics');
  });

  describe('#getGamesWithSubstitutionRequests()', () => {
    let game: Game;

    beforeEach(async () => {
      // @ts-expect-error
      const player1 = (await playersService._createOne())._id;
      // @ts-expect-error
      const player2 = (await playersService._createOne())._id;

      game = await gameModel.create({
        number: 1,
        slots: [
          {
            player: player1,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.waitingForSubstitute,
          },
          {
            player: player2,
            team: Tf2Team.red,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.active,
          },
        ],
        map: 'cp_badlands',
      });
    });

    it('should return games with substitution requests', async () => {
      const ret = await service.getGamesWithSubstitutionRequests();
      expect(ret).toEqual([expect.objectContaining({ id: game.id })]);
    });
  });

  describe('#getOrphanedGames()', () => {
    beforeEach(async () => {
      // @ts-expect-error
      const player = (await playersService._createOne())._id;

      await gameModel.create({
        number: 1,
        slots: [],
        map: 'cp_badlands',
      });

      const gameServer: GameServer = {
        id: 'FAKE_GAMESERVER',
        name: 'TEST_GAMESERVER',
        address: 'localhost',
        port: 27015,
        provider: 'test',
      };
      await gameModel.create({
        number: 2,
        slots: [],
        map: 'cp_badlands',
        gameServer,
      });
    });

    it('should return games that do not have the gameServer property set', async () => {
      const ret = await service.getOrphanedGames();
      expect(ret).toBeTruthy();
      expect(ret.length).toBe(1);
      expect(ret[0].number).toBe(1);
    });
  });

  describe('#calculatePlayerJoinGameServerTimeout()', () => {
    let testGame: Game;
    let testPlayer: Player;

    beforeEach(async () => {
      // @ts-expect-error
      testPlayer = await playersService._createOne();

      testGame = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [
          {
            player: testPlayer._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
          },
        ],
      });

      await playersService.updatePlayer(testPlayer._id, {
        activeGame: testGame._id,
      });

      configuration['games.join_gameserver_timeout'] = 5 * 60 * 1000;
      configuration['games.rejoin_gameserver_timeout'] = 3 * 60 * 1000;
    });

    describe('when the player is online', () => {
      beforeEach(async () => {
        await service.update(testGame._id, {
          'slots.0.connectionStatus': PlayerConnectionStatus.connected,
        });
      });

      it('should return undefined', async () => {
        expect(
          await service.calculatePlayerJoinGameServerTimeout(
            testGame._id,
            testPlayer._id,
          ),
        ).toBe(undefined);
      });
    });

    describe('when the player is replaced', () => {
      beforeEach(async () => {
        await service.update(testGame._id, {
          'slots.0.status': SlotStatus.replaced,
        });
      });

      it('should throw', async () => {
        await expect(
          service.calculatePlayerJoinGameServerTimeout(
            testGame._id,
            testPlayer._id,
          ),
        ).rejects.toThrow(PlayerNotInThisGameError);
      });
    });

    describe('when the game is not running', () => {
      beforeEach(async () => {
        await service.update(testGame._id, { state: GameState.created });
      });

      it('should return undefined', async () => {
        expect(
          await service.calculatePlayerJoinGameServerTimeout(
            testGame._id,
            testPlayer._id,
          ),
        ).toBe(undefined);
      });
    });

    describe('when the game is launching', () => {
      const initializedAt = new Date(2023, 2, 7, 23, 21, 0);

      beforeEach(async () => {
        await service.update(testGame._id, { state: GameState.launching });
        await service.update(testGame._id, {
          $push: {
            events: {
              event: GameEventType.gameServerInitialized,
              at: initializedAt,
              serialize: jest.fn(),
            },
          },
        });
      });

      it('should give the player exactly 5 minutes', async () => {
        expect(
          await service.calculatePlayerJoinGameServerTimeout(
            testGame._id,
            testPlayer._id,
          ),
        ).toEqual(new Date(2023, 2, 7, 23, 26, 0).getTime());
      });

      describe('and the player joined the game but then disconnected', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            $push: {
              events: [
                {
                  event: GameEventType.playerJoinedGameServer,
                  at: new Date(2023, 2, 7, 23, 23, 0), // 2 minutes after the gameserver was initialized
                  player: testPlayer._id,
                  serialize: jest.fn(),
                },
                {
                  event: GameEventType.playerJoinedGameServerTeam,
                  at: new Date(2023, 2, 7, 23, 24, 0),
                  player: testPlayer._id, // 3 minutes after the gameserver was initialized
                  serialize: jest.fn(),
                },
                {
                  event: GameEventType.playerLeftGameServer,
                  at: new Date(2023, 2, 7, 23, 25, 0),
                  player: testPlayer._id,
                  serialize: jest.fn(),
                },
              ],
            },
          });
        });

        it('should give the player 3 minutes to come back', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 28, 0).getTime());
        });
      });

      describe('but the join timeout is not specified', () => {
        beforeEach(() => {
          configuration['games.join_gameserver_timeout'] = 0;
        });

        it('should return undefined', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toBe(undefined);
        });
      });

      describe('and the player took sub more than 3 minutes before timeout', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            $push: {
              events: {
                event: GameEventType.playerReplaced,
                at: new Date(2023, 2, 7, 23, 22, 0), // 1 minute after the gameserver was initialized
                replacee: new Types.ObjectId() as PlayerId,
                replacement: testPlayer._id,
                serialize: jest.fn(),
              },
            },
          });
        });

        it('should give the player exactly 5 minutes', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 26, 0).getTime());
        });
      });

      describe('and the player took sub less than 3 minutes before timeout', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            $push: {
              events: {
                event: GameEventType.playerReplaced,
                at: new Date(2023, 2, 7, 23, 25, 0), // 4 minutes after the gameserver was initialized
                replacee: new Types.ObjectId() as PlayerId,
                replacement: testPlayer._id,
                serialize: jest.fn(),
              },
            },
          });
        });

        it('should give the player 3 minutes', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 28, 0).getTime());
        });

        describe('but the rejoin timeout is not specified', () => {
          beforeEach(() => {
            configuration['games.rejoin_gameserver_timeout'] = 0;
          });

          it('should return undefined', async () => {
            expect(
              await service.calculatePlayerJoinGameServerTimeout(
                testGame._id,
                testPlayer._id,
              ),
            ).toBe(undefined);
          });
        });
      });
    });

    describe('when the game is in progress', () => {
      beforeEach(async () => {
        await service.update(testGame._id, { state: GameState.started });
      });

      describe('and the player is online', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            'slots.0.connectionStatus': PlayerConnectionStatus.connected,
          });
        });

        it('should return undefined', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toBe(undefined);
        });
      });

      describe('and the player is joining', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            'slots.0.connectionStatus': PlayerConnectionStatus.joining,
          });
        });

        it('should return undefined', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toBe(undefined);
        });
      });

      describe('and the player is offline', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            'slots.0.connectionStatus': PlayerConnectionStatus.offline,
          });
          await service.update(testGame._id, {
            $push: {
              events: {
                event: GameEventType.playerLeftGameServer,
                at: new Date(2023, 2, 7, 23, 35, 0),
                player: testPlayer._id,
                serialize: jest.fn(),
              },
            },
          });
        });

        it('should give the player 3 minutes', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 38, 0).getTime());
        });

        describe('but the rejoin timeout is not specified', () => {
          beforeEach(() => {
            configuration['games.rejoin_gameserver_timeout'] = 0;
          });

          it('should return undefined', async () => {
            expect(
              await service.calculatePlayerJoinGameServerTimeout(
                testGame._id,
                testPlayer._id,
              ),
            ).toBe(undefined);
          });
        });
      });

      describe('and the player joined as a sub', () => {
        beforeEach(async () => {
          await service.update(testGame._id, {
            'slots.0.connectionStatus': PlayerConnectionStatus.offline,
          });
          await service.update(testGame._id, {
            $push: {
              events: {
                event: GameEventType.playerReplaced,
                at: new Date(2023, 2, 7, 23, 40, 0),
                replacee: new Types.ObjectId() as PlayerId,
                replacement: testPlayer._id,
                serialize: jest.fn(),
              },
            },
          });
        });

        it('should give the player 3 minutes', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 43, 0).getTime());
        });

        describe('but then disconnected', () => {
          beforeEach(async () => {
            await service.update(testGame._id, {
              $push: {
                events: {
                  event: GameEventType.playerLeftGameServer,
                  at: new Date(2023, 2, 7, 23, 45, 0),
                  player: testPlayer._id,
                  serialize: jest.fn(),
                },
              },
            });
          });

          it('should give the player 3 minutes to come back', async () => {
            expect(
              await service.calculatePlayerJoinGameServerTimeout(
                testGame._id,
                testPlayer._id,
              ),
            ).toEqual(new Date(2023, 2, 7, 23, 48, 0).getTime());
          });
        });
      });
    });
  });
});
