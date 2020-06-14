import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubstitutionService } from './player-substitution.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { QueueService } from '@/queue/services/queue.service';
import { DiscordService } from '@/discord/services/discord.service';
import { Environment } from '@/environment/environment';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DocumentType } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { TypegooseModule } from 'nestjs-typegoose';
import { Game } from '../models/game';

jest.mock('@/discord/services/discord.service');
jest.mock('@/players/services/players.service');
jest.mock('./games.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('./game-runtime.service');
jest.mock('../gateways/games.gateway');
jest.mock('@/queue/gateways/queue.gateway');
jest.mock('@/queue/services/queue.service');

const environment = {
  clientUrl: 'FAKE_CLIENT_URL',
};

describe('PlayerSubstitutionService', () => {
  let service: PlayerSubstitutionService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let playersService: PlayersService;
  let playerBansService: PlayerBansService;
  let gameRuntimeService: GameRuntimeService;
  let gamesGateway: GamesGateway;
  let queueGateway: QueueGateway;
  let queueService: QueueService;
  let player1: DocumentType<Player>;
  let player2: DocumentType<Player>;
  let player3: DocumentType<Player>;
  let mockGame: DocumentType<Game>;
  let discordService: DiscordService;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ Player, Game ]),
      ],
      providers: [
        PlayerSubstitutionService,
        GamesService,
        PlayersService,
        PlayerBansService,
        GameRuntimeService,
        GamesGateway,
        QueueGateway,
        QueueService,
        DiscordService,
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    service = module.get<PlayerSubstitutionService>(PlayerSubstitutionService);
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    gameRuntimeService = module.get(GameRuntimeService);
    gamesGateway = module.get(GamesGateway);
    queueGateway = module.get(QueueGateway);
    queueService = module.get(QueueService);
    discordService = module.get(DiscordService);
  });

  beforeEach(async () => {
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();
    // @ts-expect-error
    player3 = await playersService._createOne();
    // @ts-expect-error
    mockGame = await gamesService._createOne([ player1, player2 ]);

    mockGame.gameServer = new ObjectId();
    await mockGame.save();

    playerBansService.getPlayerActiveBans = () => Promise.resolve([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
  });

  describe('#substitutePlayer()', () => {
    describe('when the given game does not exist', () => {
      beforeEach(() => {
        gamesService.getById = () => Promise.resolve(null);
      });

      it('should throw an error', async () => {
        await expect(service.substitutePlayer(new ObjectId().toString(), player1.id)).rejects.toThrowError('no such game');
      });
    });

    describe('when the target player does not exist', () => {
      it('should throw an error', async () => {
        await expect(service.substitutePlayer(mockGame.id, new ObjectId().toString())).rejects.toThrowError('no such player');
      });
    });

    describe('when the target player has already been replaced', () => {
      beforeEach(async () => {
        await service.substitutePlayer(mockGame.id, player1.id);
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should throw an error', async () => {
        await expect(service.substitutePlayer(mockGame.id, player1.id)).rejects.toThrowError('this player has already been replaced');
      });
    });

    it('should update the player status', async () => {
      const game = await service.substitutePlayer(mockGame.id, player1.id);
      expect(game.id).toEqual(mockGame.id);
      const slot = game.findPlayerSlot(player1.id);
      expect(slot.status).toEqual('waiting for substitute');
    });

    it('should emit the  event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.substitutePlayer(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalledWith(game);
    });

    describe('when the game has already ended', () => {
      beforeEach(async () => {
        const game = await gamesService.getById(mockGame.id);
        game.state = 'ended';
        await game.save();
      });

      it('should reject', async () => {
        await expect(service.substitutePlayer(mockGame.id, player1.id)).rejects.toThrowError('the game has already ended');
      });
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      await service.substitutePlayer(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalled();
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.substitutePlayer(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalled();
    });

    it('should do nothing if the player is already marked', async () => {
      const game1 = await service.substitutePlayer(mockGame.id, player1.id);
      const game2 = await service.substitutePlayer(mockGame.id, player1.id);
      expect(game1.id).toEqual(game2.id);
    });
  });

  describe('#cancelSubstitutionRequest()', () => {
    let discordMessage: any;
    const channel = { send: () => discordMessage };

    beforeEach(async () => {
      discordMessage = await discordService.getPlayersChannel().send({ });
      // @ts-expect-error
      discordService.getPlayersChannel = () => channel;

      await service.substitutePlayer(mockGame.id, player1.id);
    });

    describe('when the given game does not exist', () => {
      beforeEach(() => {
        gamesService.getById = () => Promise.resolve(null);
      });

      it('should throw an error', async () => {
        await expect(service.cancelSubstitutionRequest(new ObjectId().toString(), player1.id)).rejects.toThrowError('no such game');
      });
    });

    describe('when the given player does not exist', () => {
      it('should throw an error', async () => {
        await expect(service.cancelSubstitutionRequest(mockGame.id, new ObjectId().toString())).rejects.toThrowError('no such player');
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should throw an error', async () => {
        await expect(service.cancelSubstitutionRequest(mockGame.id, player1.id)).rejects.toThrowError('this player has already been replaced');
      });
    });

    it('should update the player status', async () => {
      const game = await service.cancelSubstitutionRequest(mockGame.id, player1.id);
      const slot = game.findPlayerSlot(player1.id);
      expect(slot.status).toEqual('active');
    });

    it('should emit the event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.cancelSubstitutionRequest(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalledWith(game);
    });

    describe('when the game is no longer running', () => {
      beforeEach(async () => {
        const game = await gamesService.getById(mockGame.id);
        game.state = 'ended';
        await game.save();
      });

      it('should reject', async () => {
        await expect(service.cancelSubstitutionRequest(mockGame.id, player1.id)).rejects.toThrowError('the game has already ended');
      });
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.cancelSubstitutionRequest(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalled();
    });

    it('should get rid of discord announcement', async () => {
      const spy = jest.spyOn(discordMessage, 'delete');
      await service.cancelSubstitutionRequest(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#replacePlayer()', () => {
    let discordMessage: any;
    const channel = { send: () => discordMessage };

    beforeEach(async () => {
      discordMessage = await discordService.getPlayersChannel().send({ });
      // @ts-expect-error
      discordService.getPlayersChannel = () => channel;

      await service.substitutePlayer(mockGame.id, player1.id);
    });

    it('should replace the player', async () => {
      // replace player 1 with player 3
      const game = await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(game.id).toEqual(mockGame.id);
      const replaceeSlot = game.findPlayerSlot(player1.id);
      expect(replaceeSlot.status).toBe('replaced');
      const replacementSlot = game.findPlayerSlot(player3.id);
      expect(replacementSlot).toBeTruthy();
      expect(replacementSlot.status).toBe('active');
    });

    it('should emit the event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(spy).toHaveBeenCalledWith(game);
    });

    it('should replace the player in-game', async done => {
      const spy = jest.spyOn(gameRuntimeService, 'replacePlayer');
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith(mockGame.id, player1.id, expect.objectContaining({ player: player3._id }));
        done();
      }, 100);
    });

    describe('when the replacement player is banned', () => {
      beforeEach(() => {
        const end = new Date();
        end.setHours(end.getHours() + 1);
        playerBansService.getPlayerActiveBans = () => Promise.resolve([
          { player: 'FAKE_PLAYERID', admin: 'FAKE_ADMINID', start: new Date(), end } as any,
        ]);
      });

      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player1.id, player3.id)).rejects.toThrowError('player is banned');
      });
    });

    describe('when replacing an active player', () => {
      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player2.id, player3.id))
          .rejects.toThrowError('the replacee is marked as active');
      })
    });

    it('should mark the slot back as active if a player is subbing himself', async () => {
      const game = await service.replacePlayer(mockGame.id, player1.id, player1.id);
      expect(game.id).toEqual(mockGame.id);
      const slot = game.findPlayerSlot(player1.id);
      expect(slot.status).toBe('active');
      expect(game.slots.length).toBe(2);
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player1.id, player3.id)).rejects
          .toThrowError('this player has already been replaced');
      });
    });

    describe('when the given player is involved in another game', () => {
      beforeEach(async () => {
        gamesService.getPlayerActiveGame = () => Promise.resolve({ id: new ObjectId().toString() } as any);
      });

      it('should reject', async () => {
        await expect(service.replacePlayer(mockGame.id, player1.id, player3.id)).rejects
          .toThrowError('player is involved in a currently running game');
      });
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(spy).toHaveBeenCalled();
    });

    it('should reject if the replacement player does not exist', async () => {
      await expect(service.replacePlayer(mockGame.id, player1.id, new ObjectId().toString())).rejects
        .toThrowError('no such player');
    });

    it('should kick the replacement player from the queue', async () => {
      const spy = jest.spyOn(queueService, 'kick');
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(spy).toHaveBeenCalledWith(player3.id);
    });

    it('should announce the replacement in the game', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'sayChat');
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(spy).toHaveBeenCalledWith(mockGame.gameServer.toString(), 'fake_player_3 is replacing fake_player_1 on soldier.');
    });

    it('should delete the discord announcement', async () => {
      const spy = jest.spyOn(discordMessage, 'delete');
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(spy).toHaveBeenCalled();
    });
  });
});
