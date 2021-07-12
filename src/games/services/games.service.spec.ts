import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Game, GameDocument, gameSchema } from '../models/game';
import { ObjectId } from 'mongodb';
import { QueueSlot } from '@/queue/queue-slot';
import { GameLauncherService } from './game-launcher.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tf2Team } from '../models/tf2-team';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { GameState } from '../models/game-state';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';

jest.mock('@/players/services/players.service');
jest.mock('@/players/services/player-skill.service');
jest.mock('./game-launcher.service');
jest.mock('@/configuration/services/configuration.service');

class QueueConfigServiceStub {
  queueConfig = {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
    teamCount: 2,
    readyUpTimeout: 1000,
    queueReadyTimeout: 2000,
  };
}

describe('GamesService', () => {
  let service: GamesService;
  let mongod: MongoMemoryServer;
  let gameModel: Model<GameDocument>;
  let gameLauncherService: GameLauncherService;
  let playersService: PlayersService;
  let events: Events;
  let playerSkillService: jest.Mocked<PlayerSkillService>;
  let configurationService: jest.Mocked<ConfigurationService>;

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
        GamesService,
        PlayersService,
        PlayerSkillService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        GameLauncherService,
        Events,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameModel = module.get(getModelToken(Game.name));
    gameLauncherService = module.get(GameLauncherService);
    playersService = module.get(PlayersService);
    events = module.get(Events);
    playerSkillService = module.get(PlayerSkillService);
    configurationService = module.get(ConfigurationService);
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await gameModel.deleteMany({});
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
      expect(ret.toJSON()).toEqual(game.toJSON());
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
      expect(JSON.stringify(ret)).toEqual(
        JSON.stringify([launchingGame, runningGame]),
      );
    });
  });

  describe('#getPlayerActiveGame()', () => {
    describe('when a player is active in a game', () => {
      let game: GameDocument;
      let playerId: string;

      beforeEach(async () => {
        playerId = new ObjectId().toString();
        game = await gameModel.create({
          number: 1,
          map: 'cp_badlands',
          state: GameState.started,
          slots: [
            {
              player: playerId,
              status: SlotStatus.active,
              gameClass: Tf2ClassName.soldier,
              team: Tf2Team.blu,
            },
          ],
        });
      });

      it('should return that game', async () => {
        const ret = await service.getPlayerActiveGame(playerId);
        expect(ret).toBeTruthy();
        expect(ret.toJSON()).toEqual(game.toJSON());
      });
    });

    describe('when a player is marked as awaiting substitute in a game', () => {
      let game: GameDocument;
      let playerId: string;

      beforeEach(async () => {
        playerId = new ObjectId().toString();
        game = await gameModel.create({
          number: 1,
          map: 'cp_badlands',
          state: GameState.started,
          slots: [
            {
              player: playerId,
              status: SlotStatus.waitingForSubstitute,
              gameClass: Tf2ClassName.soldier,
              team: Tf2Team.blu,
            },
          ],
        });
      });

      it('should return that game', async () => {
        const ret = await service.getPlayerActiveGame(playerId);
        expect(ret).toBeTruthy();
        expect(ret.toJSON()).toEqual(game.toJSON());
      });
    });

    describe('when a player has been replaced in a game', () => {
      let playerId: string;
      let player2Id: string;

      beforeEach(async () => {
        playerId = new ObjectId().toString();
        player2Id = new ObjectId().toString();

        await gameModel.create({
          number: 1,
          map: 'cp_badlands',
          state: GameState.started,
          slots: [
            {
              player: playerId,
              status: SlotStatus.replaced,
              gameClass: Tf2ClassName.soldier,
              team: Tf2Team.blu,
            },
            {
              player: player2Id,
              status: SlotStatus.active,
              gameClass: Tf2ClassName.soldier,
              team: Tf2Team.red,
            },
          ],
        });
      });

      it('should not return that game', async () => {
        const ret = await service.getPlayerActiveGame(playerId);
        expect(ret).toBeNull();
      });
    });

    describe('when a player was active in a game that has already been ended', () => {
      let playerId: string;

      beforeEach(async () => {
        playerId = new ObjectId().toString();
        await gameModel.create({
          number: 1,
          map: 'cp_badlands',
          state: GameState.ended,
          slots: [
            {
              player: playerId,
              gameClass: Tf2ClassName.soldier,
              team: Tf2Team.blu,
            },
          ],
        });
      });

      it('should not return that game', async () => {
        const ret = await service.getPlayerActiveGame(playerId);
        expect(ret).toBeNull();
      });
    });
  });

  describe('#create()', () => {
    let slots: QueueSlot[];

    beforeEach(async () => {
      slots = [
        {
          id: 0,
          gameClass: Tf2ClassName.scout,
          // @ts-expect-error
          playerId: (await playersService._createOne())._id,
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

      configurationService.getDefaultPlayerSkill.mockResolvedValue(
        new Map([
          [Tf2ClassName.scout, 2],
          [Tf2ClassName.soldier, 3],
          [Tf2ClassName.demoman, 4],
          [Tf2ClassName.medic, 5],
        ]),
      );
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
      expect(game.toObject()).toEqual(
        expect.objectContaining({
          number: 1,
          map: 'cp_fake',
          slots: expect.any(Array),
          assignedSkills: expect.any(Object),
          state: 'launching',
          launchedAt: expect.any(Date),
        }),
      );
    });

    it('should emit the gameCreated event', async () =>
      new Promise<void>((resolve) => {
        events.gameCreated.subscribe(({ game }) => {
          expect(game).toMatchObject({
            number: 1,
            map: 'cp_fake',
            state: 'launching',
          });
          resolve();
        });

        service.create(slots, 'cp_fake');
      }));

    describe('when skill for a player is defined', () => {
      beforeEach(() => {
        playerSkillService.getPlayerSkill.mockImplementation((playerId) => {
          if (playerId === slots[0].playerId) {
            return Promise.resolve(new Map([[Tf2ClassName.scout, 9]]));
          } else {
            return Promise.resolve(null);
          }
        });
      });

      it('should record the given skill', async () => {
        const game = await service.create(slots, 'cp_fake');
        expect(game.assignedSkills.get(slots[0].playerId.toString())).toEqual(
          9,
        );
      });
    });

    describe('when skill for the player is not defined', () => {
      it('should assign default skill', async () => {
        const game = await service.create(slots, 'cp_fale');
        const scouts = game.slots.filter(
          (s) => s.gameClass === Tf2ClassName.scout,
        );
        expect(
          scouts.every(
            (s) => game.assignedSkills.get(s.player.toString()) === 2,
          ),
        ).toBe(true);
        const soldiers = game.slots.filter(
          (s) => s.gameClass === Tf2ClassName.soldier,
        );
        expect(
          soldiers.every(
            (s) => game.assignedSkills.get(s.player.toString()) === 3,
          ),
        ).toBe(true);
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

  describe('#launch()', () => {
    it('should launch the game', async () => {
      const spy = jest.spyOn(gameLauncherService, 'launch');
      await service.launch('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });
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

      const gameServer = new ObjectId();
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
});
