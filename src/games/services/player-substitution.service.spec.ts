import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubstitutionService } from './player-substitution.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { QueueService } from '@/queue/services/queue.service';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TypegooseModule } from 'nestjs-typegoose';
import { Player } from '@/players/models/player';
import { DocumentType } from '@typegoose/typegoose';

jest.mock('@/discord/services/discord-notifications.service');
jest.mock('@/players/services/players.service');
jest.mock('./games.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('./game-runtime.service');
jest.mock('../gateways/games.gateway');
jest.mock('@/queue/gateways/queue.gateway');
jest.mock('@/queue/services/queue.service');

describe('PlayerSubstitutionService', () => {
  let service: PlayerSubstitutionService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let playersService: PlayersService;
  let playerBansService: PlayerBansService;
  let gameRuntimeService: GameRuntimeService;
  let gamesGateway: GamesGateway;
  let discordNotificationsService: DiscordNotificationsService;
  let queueGateway: QueueGateway;
  let queueService: QueueService;
  let player1: DocumentType<Player>;
  let player2: DocumentType<Player>;
  let player3: DocumentType<Player>;
  let mockGame: any;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ Player ]),
      ],
      providers: [
        PlayerSubstitutionService,
        GamesService,
        PlayersService,
        PlayerBansService,
        GameRuntimeService,
        GamesGateway,
        DiscordNotificationsService,
        QueueGateway,
        QueueService,
      ],
    }).compile();

    service = module.get<PlayerSubstitutionService>(PlayerSubstitutionService);
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    gameRuntimeService = module.get(GameRuntimeService);
    gamesGateway = module.get(GamesGateway);
    discordNotificationsService = module.get(DiscordNotificationsService);
    queueGateway = module.get(QueueGateway);
    queueService = module.get(QueueService);
  });

  beforeEach(async () => {
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();
    // @ts-expect-error
    player3 = await playersService._createOne();

    mockGame = {
      id: new ObjectId(),
      number: 1,
      players: [ player1, player2 ],
      slots: [
        {
          player: player1._id,
          teamId: '0',
          gameClass: 'soldier',
          status: 'active',
        },
        {
          player: player2._id,
          teamId: '1',
          gameClass: 'soldier',
          status: 'active',
        },
      ],
      map: 'cp_badlands',
      state: 'launching',
      teams: new Map([['0', 'RED'], ['1', 'BLU']]),
      gameServer: 'FAKE_GAME_SERVER_ID',
      save: () => null,
    };

    gamesService.getById = () => Promise.resolve(mockGame);
    playerBansService.getPlayerActiveBans = () => Promise.resolve([]);
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#substitutePlayer()', () => {
    describe('when the given game does not exist', () => {
      beforeEach(() => {
        gamesService.getById = () => Promise.resolve(null);
      });

      it('should throw an error', async () => {
        await expect(service.substitutePlayer(new ObjectId(), player1._id)).rejects.toThrowError('no such game');
      });
    });

    describe('when the target player does not exist', () => {
      it('should throw an error', async () => {
        await expect(service.substitutePlayer(mockGame.id, new ObjectId())).rejects.toThrowError('no such player');
      });
    });

    describe('when the target player has already been replaced', () => {
      beforeEach(async () => {
        await service.substitutePlayer(mockGame.id, player1._id);
        await service.replacePlayer(mockGame.id, player1._id, player3._id);
      });

      it('should throw an error', async () => {
        await expect(service.substitutePlayer(mockGame.id, player1._id)).rejects.toThrowError('this player has already been replaced');
      });
    });

    it('should update the player status', async () => {
      const game = await service.substitutePlayer(mockGame.id, player1._id);
      expect(game).toEqual(mockGame);
      const tSlot = game.slots.find(s => (s.player as ObjectId).equals(player1._id));
      expect(tSlot.status).toEqual('waiting for substitute');
    });

    it('should emit the  event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.substitutePlayer(mockGame.id, player1._id);
      expect(spy).toHaveBeenCalledWith(game);
    });

    describe('when the game has already ended', () => {
      beforeEach(() => {
        const game = { ...mockGame, state: 'ended' };
        gamesService.getById = () => Promise.resolve(game);
      });

      it('should reject', async () => {
        await expect(service.substitutePlayer(mockGame.id, player1._id)).rejects.toThrowError('the game has already ended');
      });
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifySubstituteRequest');
      await service.substitutePlayer(mockGame.id, player1._id);
      expect(spy).toHaveBeenCalledWith({
        gameId: mockGame.id,
        gameNumber: 1,
        gameClass: 'soldier',
        team: 'RED',
      });
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.substitutePlayer(mockGame.id, player1._id);
      expect(spy).toHaveBeenCalled();
    });

    it('should do nothing if the player is already marked', async () => {
      const game1 = await service.substitutePlayer(mockGame.id, player1._id);
      const game2 = await service.substitutePlayer(mockGame.id, player1._id);
      expect(game1).toEqual(game2);
    });
  });

  describe('#cancelSubstitutionRequest()', () => {
    beforeEach(async () => {
      await service.substitutePlayer(mockGame.id, player1._id);
    });

    describe('when the given game does not exist', () => {
      beforeEach(() => {
        gamesService.getById = () => Promise.resolve(null);
      });

      it('should throw an error', async () => {
        await expect(service.cancelSubstitutionRequest(new ObjectId(), player1._id)).rejects.toThrowError('no such game');
      });
    });

    describe('when the given player does not exist', () => {
      it('should throw an error', async () => {
        await expect(service.cancelSubstitutionRequest(mockGame.id, new ObjectId())).rejects.toThrowError('no such player');
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1._id, player3._id);
      });

      it('should throw an error', async () => {
        await expect(service.cancelSubstitutionRequest(mockGame.id, player1._id)).rejects.toThrowError('this player has already been replaced');
      });
    });

    it('should update the player status', async () => {
      const game = await service.cancelSubstitutionRequest(mockGame.id, player1._id);
      const slot = game.slots.find(s => (s.player as ObjectId).equals(player1._id));
      expect(slot.status).toEqual('active');
    });

    it('should emit the event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.cancelSubstitutionRequest(mockGame.id, player1._id);
      expect(spy).toHaveBeenCalledWith(game);
    });

    describe('when the game is no longer running', () => {
      beforeEach(() => {
        mockGame.state = 'ended';
      });

      it('should reject', async () => {
        await expect(service.cancelSubstitutionRequest(mockGame.id, player1._id)).rejects.toThrowError('the game has already ended');
      });
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.cancelSubstitutionRequest(mockGame.id, player1._id);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#replacePlayer()', () => {
    beforeEach(async () => {
      await service.substitutePlayer(mockGame.id, player1._id);
    });

    it('should replace the player', async () => {
      // replace player 1 with player 3
      const game = await service.replacePlayer(mockGame.id, player1._id, player3._id);
      expect(game).toEqual(mockGame);
      const replaceeSlot = game.slots.find(s => player1._id.equals(s.player));
      expect(replaceeSlot.status).toBe('replaced');
      const replacementSlot = game.slots.find(s => player3._id.equals(s.player));
      expect(replacementSlot).toBeTruthy();
      expect(replacementSlot.status).toBe('active');
      expect(game.players.find((p: ObjectId) => p.equals(player3._id))).toBeTruthy();
    });

    it('should emit the event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.replacePlayer(mockGame.id, player1._id, player3._id);
      expect(spy).toHaveBeenCalledWith(game);
    });

    it('should replace the player in-game', async done => {
      const spy = jest.spyOn(gameRuntimeService, 'replacePlayer');
      await service.replacePlayer(mockGame.id, player1._id, player3._id);
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith(mockGame.id, player1._id, jasmine.objectContaining({ player: player3._id }));
        done();
      }, 100);
    });

    describe('when the replacement player is banned', () => {
      beforeEach(() => {
        const end = new Date();
        end.setHours(end.getHours() + 1);
        playerBansService.getPlayerActiveBans = () => Promise.resolve([
          { player: 'FAKE_PLAYER_ID', admin: 'FAKE_ADMIN_ID', start: new Date(), end } as any,
        ]);
      });

      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player1._id, player3._id)).rejects.toThrowError('player is banned');
      });
    });

    describe('when replacing an active player', () => {
      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player2._id, player3._id))
          .rejects.toThrowError('the replacee is marked as active');
      })
    });

    it('should mark the slot back as active if a player is subbing himself', async () => {
      const game = await service.replacePlayer(mockGame.id, player1._id, player1._id);
      expect(game).toEqual(mockGame);
      const slot = game.slots.find(s => player1._id.equals(s.player));
      expect(slot.status).toBe('active');
      expect(game.slots.length).toBe(2);
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1._id, player3._id);
      });

      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player1._id, player3._id)).rejects
          .toThrowError('this player has already been replaced');
      });
    });

    describe('when the given player is involved in another game', () => {
      beforeEach(async () => {
        gamesService.getPlayerActiveGame = () => Promise.resolve({ id: new ObjectId() } as any);
      });

      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player1._id, player3._id)).rejects
          .toThrowError('player is involved in a currently running game');
      });
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.replacePlayer(mockGame.id, player1._id, player3._id);
      expect(spy).toHaveBeenCalled();
    });

    it('should reject if the replacement player does not exist', async () => {
      await expect(service.replacePlayer(mockGame.id, player1._id, new ObjectId())).rejects
        .toThrowError('no such player');
    });

    it('should kick the replacement player from the queue', async () => {
      const spy = jest.spyOn(queueService, 'kick');
      await service.replacePlayer(mockGame.id, player1._id, player3._id);
      expect(spy).toHaveBeenCalledWith(player3._id);
    });

    it('should announce the replacement in the game', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'sayChat');
      await service.replacePlayer(mockGame.id, player1._id, player3._id);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID', 'fake_player_3 is replacing fake_player_1 on soldier.');
    });
  });
});
