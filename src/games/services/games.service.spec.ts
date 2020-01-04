import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { TypegooseModule, getModelToken } from 'nestjs-typegoose';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Player } from '@/players/models/player';
import { PlayerSkill } from '@/players/models/player-skill';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Game } from '../models/game';
import { GameRunnerManagerService } from './game-runner-manager.service';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Subject } from 'rxjs';
import { ObjectId } from 'mongodb';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayerBansService } from '@/players/services/player-bans.service';

class PlayersServiceStub {
  player: Player = {
    id: 'FAKE_PLAYER_ID',
    steamId: 'FAKE_STEAM_ID',
    name: 'FAKE_PLAYER_NAME',
    hasAcceptedRules: true,
  };

  async getById(playerId: string) {
    return new Promise(resolve => resolve({ ...this.player, _id: playerId }));
  }
}

class PlayerSkillServiceStub {
  playerSkill: PlayerSkill = {
    skill: new Map([['scout', 1], ['soldier', 2], ['demoman', 3], ['medic', 4]]),
  };

  async getPlayerSkill(playerId: string) {
    return new Promise(resolve => resolve({ ...this.playerSkill, player: playerId }));
  }
}

class QueueConfigServiceStub {
  queueConfig = {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
    teamCount: 2,
    maps: ['fake_map_1', 'fake_map_2'],
    readyUpTimeout: 1000,
    queueReadyTimeout: 2000,
  };
}

class GameRunnerStub {
  constructor(public gameId: string) { }
  gameInitialized = new Subject<void>();
  gameFinished = new Subject<void>();
  gameUpdated = new Subject<void>();
  gameServer = null;
  game = null;
  initialize() { return null; }
  launch() { return null; }
  reconfigure() { return null; }
  forceEnd() { return null; }
}

class GameRunnerManagerServiceStub {
  createGameRunner(gameId: string) { return new GameRunnerStub(gameId); }
  findGameRunnerByGameId(gameId: string) { return new GameRunnerStub(gameId); }
}

class PlayerBansServiceStub {
  getPlayerActiveBans(playerId: string) { return []; }
}

describe('GamesService', () => {
  let service: GamesService;
  let gameModel: ReturnModelType<typeof Game>;
  let gameRunnerManagerService: GameRunnerManagerServiceStub;
  let playerBansService: PlayerBansServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(),
        TypegooseModule.forFeature([Game]),
      ],
      providers: [
        GamesService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: GameRunnerManagerService, useClass: GameRunnerManagerServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameModel = module.get(getModelToken('Game'));
    gameRunnerManagerService = module.get(GameRunnerManagerService);
    playerBansService = module.get(PlayerBansService);

    await gameModel.deleteMany({ });
  });

  afterEach(async () => await gameModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    it('should resurrect game runners', async () => {
      const game = await gameModel.create({ number: 1, map: 'cp_badlands', state: 'launching' });
      const spy = spyOn(gameRunnerManagerService, 'createGameRunner').and.callThrough();
      await service.onModuleInit();
      expect(spy).toHaveBeenCalledWith(game.id);
    });
  });

  describe('#getGameCount()', () => {
    it('should return document count', async () => {
      const spy = spyOn(gameModel, 'estimatedDocumentCount').and.callThrough();
      const ret = await service.getGameCount();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual(0);
    });
  });

  describe('#getById()', () => {
    it('should get the game by its id', async () => {
      const game = await gameModel.create({ number: 1, map: 'cp_badlands' });
      const ret = await service.getById(game.id);
      expect(ret.toJSON()).toEqual(game.toJSON());
    });
  });

  describe('#getRunningGames()', () => {
    it('should get only running games', async () => {
      const launchingGame = await gameModel.create({ number: 1, map: 'cp_badlands', state: 'launching' });
      const runningGame = await gameModel.create({ number: 2, map: 'cp_badlands', state: 'started' });
      const endedGame = await gameModel.create({ number: 3, map: 'cp_badlands', state: 'ended' });

      const ret = await service.getRunningGames();
      expect(ret.length).toEqual(2);
      expect(JSON.stringify(ret)).toEqual(JSON.stringify([ launchingGame, runningGame ]));
    });
  });

  describe('#findByAssignedGameServer()', () => {
    it('should get the last game', async () => {
      const now = new Date();
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      const serverId = new ObjectId();

      const game = await gameModel.create({ number: 2, map: 'cp_process_final', state: 'started', createdAt: now, gameServer: serverId });

      const ret = await service.findByAssignedGameServer(serverId.toString());
      expect(ret.toJSON()).toEqual(game.toJSON());
    });
  });

  describe('#getPlayerActiveGame()', () => {
    it('should return an active game for the given player', async () => {
      const playerId = new ObjectId();
      const game = await gameModel.create({ number: 1, map: 'cp_badlands', state: 'started', players: [ playerId ] });
      const ret = await service.getPlayerActiveGame(playerId.toString());
      expect(ret.toJSON()).toEqual(game.toJSON());
    });
  });

  describe('#create()', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 1, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 2, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 3, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 4, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 5, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 6, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 7, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 8, gameClass: 'demoman', playerId: new ObjectId(), ready: true, friend: null },
      { id: 9, gameClass: 'demoman', playerId: new ObjectId(), ready: true, friend: null },
      { id: 10, gameClass: 'medic', playerId: new ObjectId(), ready: true, friend: null },
      { id: 11, gameClass: 'medic', playerId: new ObjectId(), ready: true, friend: null },
    ] as any;

    beforeEach(async () => gameModel.deleteMany({ }));

    it('should fail if the queue is not full', async () => {
      slots[3].ready = false;
      expectAsync(service.create(slots, 'cp_fake')).toBeRejectedWithError('queue not full');
    });

    it('should create a game', async () => {
      const game = await service.create(slots, 'cp_fake');
      expect(game.toObject()).toEqual({
        number: 1,
        map: 'cp_fake',
        teams: new Map([ [ '0', 'RED' ], [ '1', 'BLU' ] ]),
        slots: jasmine.any(Array),
        players: slots.map(s => s.playerId),
        assignedSkills: jasmine.any(Object),
        state: 'launching',
        launchedAt: jasmine.any(Date),
        _id: jasmine.any(ObjectId),
        __v: 0,
      });
    });
  });

  describe('#launch()', () => {
    it('should create the gameRunner', async () => {
      const spy = spyOn(gameRunnerManagerService, 'createGameRunner').and.callThrough();
      await service.launch('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });

    it('should initialize and launch the created game', async () => {
      const gameRunner = new GameRunnerStub('FAKE_GAME_ID');
      spyOn(gameRunnerManagerService, 'createGameRunner').and.returnValue(gameRunner);
      const spyInitialize = spyOn(gameRunner, 'initialize').and.callThrough();
      const spyLaunch = spyOn(gameRunner, 'launch').and.callThrough();
      await service.launch('FAKE_GAME_ID');
      expect(spyInitialize).toHaveBeenCalled();
      expect(spyLaunch).toHaveBeenCalled();
    });

    it('should forward the gameUpdated event', async done => {
      const gameRunner = new GameRunnerStub('FAKE_GAME_ID');
      spyOn(gameRunnerManagerService, 'createGameRunner').and.returnValue(gameRunner);
      await service.launch('FAKE_GAME_ID');

      service.gameUpdated.subscribe(game => {
        expect(game).toEqual(gameRunner.game);
        done();
      });
      gameRunner.gameUpdated.next();
    });
  });

  describe('#reinitialize()', () => {
    it('should call gameRunner.reinitialize()', async () => {
      const gameRunner = new GameRunnerStub('FAKE_GAME_ID');
      const findSpy = spyOn(gameRunnerManagerService, 'findGameRunnerByGameId').and.returnValue(gameRunner);
      const reconfigureSpy = spyOn(gameRunner, 'reconfigure').and.callThrough();
      await service.reinitialize('FAKE_GAME_ID');
      expect(findSpy).toHaveBeenCalledWith('FAKE_GAME_ID');
      expect(reconfigureSpy).toHaveBeenCalled();
    });

    it('should throw an error if the given game doesn\'t exist', async () => {
      spyOn(gameRunnerManagerService, 'findGameRunnerByGameId').and.returnValue(null);
      await expectAsync(service.reinitialize('FAKE_GAME_ID')).toBeRejectedWithError('no such game');
    });
  });

  describe('#forceEnd()', () => {
    it('should call gameRunner.forceEnd()', async () => {
      const gameRunner = new GameRunnerStub('FAKE_GAME_ID');
      const findSpy = spyOn(gameRunnerManagerService, 'findGameRunnerByGameId').and.returnValue(gameRunner);
      const forceEndSpy = spyOn(gameRunner, 'forceEnd').and.callThrough();
      await service.forceEnd('FAKE_GAME_ID');
      expect(findSpy).toHaveBeenCalledWith('FAKE_GAME_ID');
      expect(forceEndSpy).toHaveBeenCalled();
    });

    it('should throw an error if the given game doesn\'t exist', async () => {
      spyOn(gameRunnerManagerService, 'findGameRunnerByGameId').and.returnValue(null);
      await expectAsync(service.forceEnd('FAKE_GAME_ID')).toBeRejectedWithError('no such game');
    });
  });

  describe('#substitutePlayer()', () => {
    it('should throw an error if the given game doesn\'t exist', async () => {
      await expectAsync(service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_ID')).toBeRejectedWithError('no such game');
    });

    describe('with game', () => {
      let game: DocumentType<Game>;
      let playerA: ObjectId;
      let playerB: ObjectId;

      beforeEach(async () => {
        playerA = new ObjectId();
        playerB = new ObjectId();

        game = await gameModel.create({
          number: 1,
          players: [ playerA, playerB ],
          slots: [
            {
              playerId: playerA,
              teamId: '0',
              gameClass: 'soldier',
            },
            {
              playerId: playerB,
              teamId: '1',
              gameClass: 'soldier',
            },
          ],
          map: 'cp_badlands',
        });
      });

      it('should throw an error if the given player does not exist', async () => {
        await expectAsync(service.substitutePlayer(game.id.toString(), new ObjectId().toString())).toBeRejectedWithError('no such player');
      });

      it('should throw an error if the given player has already been replaced', async () => {
        const slot = game.slots.find(s => s.playerId === playerA.toString());
        slot.status = 'replaced';
        await game.save();

        await expectAsync(service.substitutePlayer(game.id.toString(), playerA.toString())).toBeRejectedWithError('this player has already been replaced');
      });

      it('should update the player status', async () => {
        await service.substitutePlayer(game.id.toString(), playerA.toString());

        const tGame = await gameModel.findById(game.id);
        const tSlot = tGame.slots.find(s => s.playerId === playerA.toString());
        expect(tSlot.status).toEqual('waiting for substitute');
      });

      it('should emit an event', async done => {
        service.gameUpdated.subscribe(tGame => {
          expect(tGame.number).toEqual(game.number);
          done();
        });
        await service.substitutePlayer(game.id.toString(), playerA.toString());
      });
    });
  });

  describe('#cancelSubstitutionRequest()', () => {
    it('should throw an error if the given game does not exist', async () => {
      await expectAsync(service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_ID')).toBeRejectedWithError('no such game');
    });

    describe('with game', () => {
      let game: DocumentType<Game>;
      let playerA: ObjectId;
      let playerB: ObjectId;

      beforeEach(async () => {
        playerA = new ObjectId();
        playerB = new ObjectId();

        game = await gameModel.create({
          number: 1,
          players: [ playerA, playerB ],
          slots: [
            {
              playerId: playerA,
              teamId: '0',
              gameClass: 'soldier',
              status: 'waiting for substitute',
            },
            {
              playerId: playerB,
              teamId: '1',
              gameClass: 'soldier',
              status: 'waiting for substitute',
            },
          ],
          map: 'cp_badlands',
        });
      });

      it('should throw an error if the given player does not exist', async () => {
        await expectAsync(service.cancelSubstitutionRequest(game.id.toString(), new ObjectId().toString())).toBeRejectedWithError('no such player');
      });

      it('should throw an error if the given player has already been replaced', async () => {
        const slot = game.slots.find(s => s.playerId === playerA.toString());
        slot.status = 'replaced';
        await game.save();

        await expectAsync(service.cancelSubstitutionRequest(game.id.toString(), playerA.toString())).toBeRejectedWithError('this player has already been replaced');
      });

      it('should update the player status', async () => {
        await service.cancelSubstitutionRequest(game.id.toString(), playerA.toString());

        const tGame = await gameModel.findById(game.id);
        const tSlot = tGame.slots.find(s => s.playerId === playerA.toString());
        expect(tSlot.status).toEqual('active');
      });

      it('should emit an event', async done => {
        service.gameUpdated.subscribe(tGame => {
          expect(tGame.number).toEqual(game.number);
          done();
        });
        await service.cancelSubstitutionRequest(game.id.toString(), playerA.toString());
      });
    });
  });

  describe('#replacePlayer()', () => {
    let gameId: string;
    let replacee: string;
    let replacement: string;
    let activePlayer: string;

    beforeEach(async () => {
      replacee = new ObjectId().toString();
      replacement = new ObjectId().toString();

      activePlayer = new ObjectId().toString();

      const game = await gameModel.create({
        number: 1,
        players: [ replacee, activePlayer ],
        slots: [
          {
            playerId: replacee,
            teamId: '0',
            gameClass: 'soldier',
            status: 'waiting for substitute',
          },
          {
            playerId: activePlayer,
            teamId: '1',
            gameClass: 'soldier',
            status: 'active',
          },
        ],
        map: 'cp_badlands',
      });

      gameId = game.id;
    });

    it('should reject if the given player is banned', async () => {
      const end = new Date();
      end.setHours(end.getHours() + 1);
      spyOn(playerBansService, 'getPlayerActiveBans').and.returnValue([
        { player: 'FAKE_PLAYER_ID', admin: 'FAKE_ADMIN_ID', start: new Date(), end },
      ]);

      await expectAsync(service.replacePlayer(gameId, replacee, replacement))
        .toBeRejectedWithError('player is banned');
    });

    it('should reject if replacee is marked as active', async () => {
      await expectAsync(service.replacePlayer(gameId, activePlayer, replacement))
        .toBeRejectedWithError('the replacee is marked as active');
    });

    it('should mark the slot back as active if a player is subbing himself', async () => {
      await service.replacePlayer(gameId, replacee, replacee);
      const game = await gameModel.findById(gameId);
      const slot = game.slots.find(s => s.playerId === replacee);
      expect(slot.status).toBe('active');
    });

    it('should replace the player', async () => {
      await service.replacePlayer(gameId, replacee, replacement);
      const game = await gameModel.findById(gameId);
      const replaceeSlot = game.slots.find(s => s.playerId === replacee);
      expect(replaceeSlot.status).toBe('replaced');
      const replacementSlot = game.slots.find(s => s.playerId === replacement);
      expect(replacementSlot).toBeDefined();
      expect(replacementSlot.status).toBe('active');
      expect(game.players.includes(replacement as any)).toBe(true);
    });

    it('should reject if the given player has already been replaced', async () => {
      await service.replacePlayer(gameId, replacee, replacement);
      expectAsync(service.replacePlayer(gameId, replacee, replacement)).toBeRejectedWithError('this player has already been replaced');
    });
  });
});
