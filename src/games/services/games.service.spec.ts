import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Game, GameDocument, gameSchema } from '../models/game';
import { QueueSlot } from '@/queue/queue-slot';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tf2Team } from '../models/tf2-team';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { GameState } from '../models/game-state';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { Connection, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Mutex } from 'async-mutex';
import { GameServer } from '../models/game-server';
import { VoiceServerType } from '../voice-server-type';
import { GameEventType } from '../models/game-event';
import { PlayerEventType } from '../models/player-event';
import { PlayerConnectionStatus } from '../models/player-connection-status';

jest.mock('@/players/services/players.service');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/game-servers/services/game-servers.service');

describe('GamesService', () => {
  let service: GamesService;
  let mongod: MongoMemoryServer;
  let gameModel: Model<GameDocument>;
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
          provide: 'GAME_MODEL_MUTEX',
          useValue: new Mutex(),
        },
        GamesService,
        PlayersService,
        {
          provide: 'QUEUE_CONFIG',
          useValue: {
            classes: [
              { name: 'scout', count: 2 },
              { name: 'soldier', count: 2 },
              { name: 'demoman', count: 1 },
              { name: 'medic', count: 1 },
            ],
            teamCount: 2,
            readyUpTimeout: 1000,
            queueReadyTimeout: 2000,
          },
        },
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
      const spy = jest.spyOn(gameModel, 'estimatedDocumentCount');
      const ret = await service.getGameCount();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual(0);
    });
  });

  describe('#getById()', () => {
    let game: GameDocument;

    beforeEach(async () => {
      game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [],
      });
    });

    it('should get the game by its id', async () => {
      const ret = await service.getById(game.id);
      expect(ret.id).toEqual(game.id);
    });
  });

  describe('#getByNumber()', () => {
    let game: GameDocument;

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
    let game: GameDocument;

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
    let launchingGame: GameDocument;
    let runningGame: GameDocument;
    let endedGame: GameDocument;

    beforeEach(async () => {
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
      expect(ret.length).toEqual(2);
      expect(
        [launchingGame.id, runningGame.id].every((id) =>
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
      const ret = await service.getGames({ 'events.0.at': -1 }, 10, 0);
      expect(ret.length).toEqual(2);
    });

    it('should honor limit', async () => {
      const ret = await service.getGames({ 'events.0.at': -1 }, 1, 0);
      expect(ret.length).toEqual(1);
    });

    it('should honor sort', async () => {
      const ret = await service.getGames({ 'events.0.at': 1 }, 2, 0);
      expect(ret[0].number).toBe(1);
      expect(ret[1].number).toBe(2);
    });
  });

  describe('#create()', () => {
    let slots: QueueSlot[];
    let playerWithSkill: PlayerDocument;

    beforeEach(async () => {
      // @ts-expect-error
      playerWithSkill = await playersService._createOne();
      playerWithSkill.skill = new Map([[Tf2ClassName.scout, 9]]);
      await playerWithSkill.save();

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
        expect(
          game.assignedSkills?.get(`${(slots[0] as QueueSlot).playerId}`),
        ).toEqual(9);
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
    let testGame: GameDocument;
    let testPlayer: PlayerDocument;

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

      testPlayer.activeGame = testGame._id;
      await testPlayer.save();
    });

    it('should mark the game as forcefully ended', async () => {
      const game = await service.forceEnd(testGame.id);
      expect(game.state).toEqual(GameState.interrupted);
      expect(game.error).toEqual('ended by admin');
    });

    it('should unassign the game', async () => {
      await service.forceEnd(testGame.id);
      const player = await playersService.getById(testPlayer.id);
      expect(player.activeGame).toBeUndefined();
    });

    it('should register the ended event', async () => {
      const game = await service.forceEnd(testGame.id);
      expect(game.endedAt).toBeTruthy();
    });

    it('should emit an event', () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ oldGame, newGame }) => {
          expect(oldGame.id).toEqual(testGame.id);
          expect(newGame.id).toEqual(testGame.id);
          expect(newGame.state).toEqual(GameState.interrupted);
          resolve();
        });
        service.forceEnd(testGame.id);
      }));
  });

  describe('#getMostActivePlayers()', () => {
    let player1: PlayerDocument;
    let player2: PlayerDocument;

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
    let game: GameDocument;

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

  describe('#getVoiceChannelUrl()', () => {
    let game: GameDocument;
    let player: PlayerDocument;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();

      game = await gameModel.create({
        number: 512,
        map: 'cp_badlands',
        slots: [
          {
            player: player._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.active,
          },
        ],
      });
    });

    describe('when the game is not running', () => {
      beforeEach(async () => {
        game.state = GameState.ended;
        await game.save();
      });

      it('should throw an error', async () => {
        await expect(
          service.getVoiceChannelUrl(game.id, player.id),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });

    describe('when a player is not part of the game', () => {
      let anotherPlayer: PlayerDocument;

      beforeEach(async () => {
        // @ts-expect-error
        anotherPlayer = await playersService._createOne();
      });

      it('should throw an error', async () => {
        await expect(
          service.getVoiceChannelUrl(game.id, anotherPlayer.id),
        ).rejects.toThrow(PlayerNotInThisGameError);
      });
    });

    describe('when the voice server is none', () => {
      beforeEach(() => {
        configuration['games.voice_server_type'] = VoiceServerType.none;
      });

      it('should return null', async () => {
        expect(await service.getVoiceChannelUrl(game.id, player.id)).toBe(null);
      });
    });

    describe('when the voice server is a static link', () => {
      beforeEach(() => {
        configuration['games.voice_server_type'] = VoiceServerType.staticLink;
        configuration['games.voice_server.static_link'] = 'SOME_STATIC_LINK';
      });

      it('should return the static link', async () => {
        expect(await service.getVoiceChannelUrl(game.id, player.id)).toEqual(
          'SOME_STATIC_LINK',
        );
      });
    });

    describe('when the voice server is a mumble server', () => {
      beforeEach(() => {
        configuration['games.voice_server_type'] = VoiceServerType.mumble;
        configuration['games.voice_server.mumble.url'] = 'melkor.tf';
        configuration['games.voice_server.mumble.port'] = 64738;
        configuration['games.voice_server.mumble.channel_name'] =
          'FAKE_CHANNEL_NAME';
      });

      it('should return direct mumble channel url', async () => {
        const url = await service.getVoiceChannelUrl(game.id, player.id);
        expect(url).toEqual(
          'mumble://fake_player_1@melkor.tf:64738/FAKE_CHANNEL_NAME/512/BLU',
        );
      });

      describe('when the mumble server has a password', () => {
        beforeEach(() => {
          configuration['games.voice_server_type'] = VoiceServerType.mumble;
          configuration['games.voice_server.mumble.url'] = 'melkor.tf';
          configuration['games.voice_server.mumble.port'] = 64738;
          configuration['games.voice_server.mumble.channel_name'] =
            'FAKE_CHANNEL_NAME';
          configuration['games.voice_server.mumble.password'] =
            'FAKE_SERVER_PASSWORD';
        });

        it('should handle the password in the url', async () => {
          const url = await service.getVoiceChannelUrl(game.id, player.id);
          expect(url).toEqual(
            'mumble://fake_player_1:FAKE_SERVER_PASSWORD@melkor.tf:64738/FAKE_CHANNEL_NAME/512/BLU',
          );
        });
      });
    });
  });

  describe('#calculatePlayerJoinGameServerTimeout()', () => {
    let testGame: GameDocument;
    let testPlayer: PlayerDocument;

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

      testPlayer.activeGame = testGame._id;
      await testPlayer.save();

      configuration['games.join_gameserver_timeout'] = 5 * 60 * 1000;
      configuration['games.rejoin_gameserver_timeout'] = 3 * 60 * 1000;
    });

    describe('when the player is replaced', () => {
      beforeEach(async () => {
        testGame.slots[0].status === SlotStatus.replaced;
        await testGame.save();
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

    describe('when the game is not running', () => {
      beforeEach(async () => {
        testGame.state = GameState.created;
        await testGame.save();
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
        testGame.events.push({
          event: GameEventType.GameServerInitialized,
          at: initializedAt,
        });
        testGame.state = GameState.launching;
        await testGame.save();
      });

      it('should give the player exactly 5 minutes', async () => {
        expect(
          await service.calculatePlayerJoinGameServerTimeout(
            testGame._id,
            testPlayer._id,
          ),
        ).toEqual(new Date(2023, 2, 7, 23, 26, 0).getTime());
      });

      describe('and the player took sub more than 3 minutes before timeout', () => {
        beforeEach(async () => {
          testGame.slots[0].events.push({
            event: PlayerEventType.replacesPlayer,
            at: new Date(2023, 2, 7, 23, 22, 0), // 1 minute after the gameserver was initialized
          });
          await testGame.save();
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
          testGame.slots[0].events.push({
            event: PlayerEventType.replacesPlayer,
            at: new Date(2023, 2, 7, 23, 25, 0), // 4 minutes after the gameserver was initialized
          });
          await testGame.save();
        });

        it('should give the player 3 minutes', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 28, 0).getTime());
        });
      });
    });

    describe('when the game is in progress', () => {
      beforeEach(async () => {
        testGame.state = GameState.started;
        await testGame.save();
      });

      describe('and the player is online', () => {
        beforeEach(async () => {
          testGame.slots[0].connectionStatus = PlayerConnectionStatus.connected;
          await testGame.save();
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
          testGame.slots[0].connectionStatus = PlayerConnectionStatus.joining;
          await testGame.save();
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
          testGame.slots[0].connectionStatus = PlayerConnectionStatus.offline;
          testGame.slots[0].events.push({
            event: PlayerEventType.leavesGameServer,
            at: new Date(2023, 2, 7, 23, 35, 0),
          });
          await testGame.save();
        });

        it('should give the player 3 minutes', async () => {
          expect(
            await service.calculatePlayerJoinGameServerTimeout(
              testGame._id,
              testPlayer._id,
            ),
          ).toEqual(new Date(2023, 2, 7, 23, 38, 0).getTime());
        });
      });

      describe('and the player joined as a sub', () => {
        beforeEach(async () => {
          testGame.slots[0].connectionStatus = PlayerConnectionStatus.offline;
          testGame.slots[0].events.push({
            event: PlayerEventType.replacesPlayer,
            at: new Date(2023, 2, 7, 23, 40, 0),
          });
          await testGame.save();
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
            testGame.slots[0].events.push({
              event: PlayerEventType.leavesGameServer,
              at: new Date(2023, 2, 7, 23, 45, 0),
            });
            await testGame.save();
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
