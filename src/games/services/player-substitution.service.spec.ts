import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubstitutionService } from './player-substitution.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GameRuntimeService } from './game-runtime.service';
import { QueueService } from '@/queue/services/queue.service';
import { DiscordService } from '@/plugins/discord/services/discord.service';
import { Environment } from '@/environment/environment';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Game, GameDocument, gameSchema } from '../models/game';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';
import { MongooseModule } from '@nestjs/mongoose';
import { Error } from 'mongoose';

jest.mock('@/plugins/discord/services/discord.service');
jest.mock('@/players/services/players.service');
jest.mock('./games.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('./game-runtime.service');
jest.mock('../gateways/games.gateway');
jest.mock('@/queue/services/queue.service');

const environment = {
  clientUrl: 'FAKE_CLIENT_URL',
  discordQueueNotificationsMentionRole: 'TF2 gamers',
};

describe('PlayerSubstitutionService', () => {
  let service: PlayerSubstitutionService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let playersService: PlayersService;
  let playerBansService: PlayerBansService;
  let gameRuntimeService: jest.Mocked<GameRuntimeService>;
  let queueService: jest.Mocked<QueueService>;
  let player1: PlayerDocument;
  let player2: PlayerDocument;
  let player3: PlayerDocument;
  let mockGame: GameDocument;
  let discordService: jest.Mocked<DiscordService>;
  let events: Events;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Player.name, schema: playerSchema },
          { name: Game.name, schema: gameSchema },
        ]),
      ],
      providers: [
        PlayerSubstitutionService,
        GamesService,
        PlayersService,
        PlayerBansService,
        GameRuntimeService,
        QueueService,
        DiscordService,
        { provide: Environment, useValue: environment },
        Events,
      ],
    }).compile();

    service = module.get<PlayerSubstitutionService>(PlayerSubstitutionService);
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    gameRuntimeService = module.get(GameRuntimeService);
    queueService = module.get(QueueService);
    discordService = module.get(DiscordService);
    events = module.get(Events);
  });

  beforeEach(async () => {
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();
    // @ts-expect-error
    player3 = await playersService._createOne();
    // @ts-expect-error
    mockGame = await gamesService._createOne([player1, player2]);

    mockGame.gameServer = new ObjectId();
    await mockGame.save();

    playerBansService.getPlayerActiveBans = () => Promise.resolve([]);
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

  describe('#substitutePlayer()', () => {
    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(new ObjectId().toString(), player1.id),
        ).rejects.toThrowError('no such game');
      });
    });

    describe('when the target player does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(mockGame.id, new ObjectId().toString()),
        ).rejects.toThrowError('no such player');
      });
    });

    describe('when the target player has already been replaced', () => {
      beforeEach(async () => {
        await service.substitutePlayer(mockGame.id, player1.id);
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(mockGame.id, player1.id),
        ).rejects.toThrowError('this player has already been replaced');
      });
    });

    it('should update the player status', async () => {
      const game = await service.substitutePlayer(mockGame.id, player1.id);
      expect(game.id).toEqual(mockGame.id);
      const slot = game.findPlayerSlot(player1.id);
      expect(slot.status).toEqual(SlotStatus.waitingForSubstitute);
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.substitutePlayer(mockGame.id, player1.id);
      }));

    describe('when the game has already ended', () => {
      beforeEach(async () => {
        const game = await gamesService.getById(mockGame.id);
        game.state = GameState.ended;
        await game.save();
      });

      it('should reject', async () => {
        await expect(
          service.substitutePlayer(mockGame.id, player1.id),
        ).rejects.toThrowError('the game has already ended');
      });
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      await service.substitutePlayer(mockGame.id, player1.id);
      expect(spy).toHaveBeenCalledWith('&<TF2 gamers>', {
        embed: expect.any(Object),
      });
    });

    // eslint-disable-next-line jest/expect-expect
    it('should emit the substituteRequestsChange event', async () =>
      new Promise<void>((resolve) => {
        events.substituteRequestsChange.subscribe(resolve);
        service.substitutePlayer(mockGame.id, player1.id);
      }));

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
      discordMessage = await discordService.getPlayersChannel().send({});
      // @ts-expect-error
      discordService.getPlayersChannel = () => channel;

      await service.substitutePlayer(mockGame.id, player1.id);
    });

    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(
            new ObjectId().toString(),
            player1.id,
          ),
        ).rejects.toThrowError('no such game');
      });
    });

    describe('when the given player does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(
            mockGame.id,
            new ObjectId().toString(),
          ),
        ).rejects.toThrowError('no such player');
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(mockGame.id, player1.id),
        ).rejects.toThrowError('this player has already been replaced');
      });
    });

    it('should update the player status', async () => {
      const game = await service.cancelSubstitutionRequest(
        mockGame.id,
        player1.id,
      );
      const slot = game.findPlayerSlot(player1.id);
      expect(slot.status).toEqual(SlotStatus.active);
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.cancelSubstitutionRequest(mockGame.id, player1.id);
      }));

    describe('when the game is no longer running', () => {
      beforeEach(async () => {
        const game = await gamesService.getById(mockGame.id);
        game.state = GameState.ended;
        await game.save();
      });

      it('should reject', async () => {
        await expect(
          service.cancelSubstitutionRequest(mockGame.id, player1.id),
        ).rejects.toThrowError('the game has already ended');
      });
    });

    // eslint-disable-next-line jest/expect-expect
    it('should emit the substituteRequestsChange event', async () =>
      new Promise<void>((resolve) => {
        events.substituteRequestsChange.subscribe(resolve);
        service.cancelSubstitutionRequest(mockGame.id, player1.id);
      }));

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
      discordMessage = await discordService.getPlayersChannel().send({});
      // @ts-expect-error
      discordService.getPlayersChannel = () => channel;

      await service.substitutePlayer(mockGame.id, player1.id);
    });

    it('should replace the player', async () => {
      // replace player 1 with player 3
      const game = await service.replacePlayer(
        mockGame.id,
        player1.id,
        player3.id,
      );
      expect(game.id).toEqual(mockGame.id);
      const replaceeSlot = game.findPlayerSlot(player1.id);
      expect(replaceeSlot.status).toEqual(SlotStatus.replaced);
      const replacementSlot = game.findPlayerSlot(player3.id);
      expect(replacementSlot).toBeTruthy();
      expect(replacementSlot.status).toEqual(SlotStatus.active);
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.replacePlayer(mockGame.id, player1.id, player3.id);
      }));

    it('should replace the player in-game', async () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gameRuntimeService.replacePlayer).toHaveBeenCalledWith(
            mockGame.id,
            player1.id,
            expect.objectContaining({ player: player3._id }),
          );
          resolve();
        }, 100);
        service.replacePlayer(mockGame.id, player1.id, player3.id);
      }));

    describe('when the replacement player is banned', () => {
      beforeEach(() => {
        const end = new Date();
        end.setHours(end.getHours() + 1);
        playerBansService.getPlayerActiveBans = () =>
          Promise.resolve([
            {
              player: 'FAKE_PLAYERID',
              admin: 'FAKE_ADMINID',
              start: new Date(),
              end,
            } as any,
          ]);
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player1.id, player3.id),
        ).rejects.toThrowError('player is banned');
      });
    });

    describe('when replacing an active player', () => {
      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player2.id, player3.id),
        ).rejects.toThrowError();
      });
    });

    describe('when a player is subbing himself', () => {
      it('should mark the slot back as active', async () => {
        const game = await service.replacePlayer(
          mockGame.id,
          player1.id,
          player1.id,
        );
        expect(game.id).toEqual(mockGame.id);
        const slot = game.findPlayerSlot(player1.id);
        expect(slot.status).toBe(SlotStatus.active);
        expect(game.slots.length).toBe(2);
      });

      it('should delete the discord announcement', async () => {
        const spy = jest.spyOn(discordMessage, 'delete');
        await service.replacePlayer(mockGame.id, player1.id, player1.id);
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player1.id, player3.id),
        ).rejects.toThrowError();
      });
    });

    describe('when the given player is involved in another game', () => {
      beforeEach(async () => {
        gamesService.getPlayerActiveGame = () =>
          Promise.resolve({ id: new ObjectId().toString() } as any);
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player1.id, player3.id),
        ).rejects.toThrowError(
          'player is involved in a currently running game',
        );
      });
    });

    // eslint-disable-next-line jest/expect-expect
    it('should emit the substituteRequestsChange event', async () =>
      new Promise<void>((resolve) => {
        events.substituteRequestsChange.subscribe(resolve);
        service.replacePlayer(mockGame.id, player1.id, player3.id);
      }));

    it('should reject if the replacement player does not exist', async () => {
      await expect(
        service.replacePlayer(
          mockGame.id,
          player1.id,
          new ObjectId().toString(),
        ),
      ).rejects.toThrow(Error.DocumentNotFoundError);
    });

    it('should kick the replacement player from the queue', async () => {
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(queueService.kick).toHaveBeenCalledWith(player3.id);
    });

    it('should announce the replacement in the game', async () => {
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(gameRuntimeService.sayChat).toHaveBeenCalledWith(
        mockGame.gameServer.toString(),
        'fake_player_3 is replacing fake_player_1 on soldier.',
      );
    });

    it('should delete the discord announcement', async () => {
      const spy = jest.spyOn(discordMessage, 'delete');
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(spy).toHaveBeenCalled();
    });

    it("should remove player's active game", async () => {
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      const player = await playersService.getById(player1.id);
      expect(player.activeGame).toBe(undefined);
    });

    describe('when a player1 gets replaced, but then player2 leaves', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
        await service.substitutePlayer(mockGame.id, player2.id);
      });

      it("player1 should be able to take player2's slot", async () => {
        const game = await service.replacePlayer(
          mockGame.id,
          player2.id,
          player1.id,
        );
        expect(
          game.slots.filter(
            (s) => s.player.toString().localeCompare(player1.id) == 0,
          ).length,
        ).toEqual(2);
      });
    });
  });
});
