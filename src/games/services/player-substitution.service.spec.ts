import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubstitutionService } from './player-substitution.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { QueueService } from '@/queue/services/queue.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Game, GameDocument, gameSchema } from '../models/game';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Connection, Error, Model, Types } from 'mongoose';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { WrongGameSlotStatusError } from '../errors/wrong-game-slot-status.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';

jest.mock('@/players/services/players.service');
jest.mock('./games.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('../gateways/games.gateway');
jest.mock('@/queue/services/queue.service');

describe('PlayerSubstitutionService', () => {
  let service: PlayerSubstitutionService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let playersService: PlayersService;
  let playerBansService: PlayerBansService;
  let queueService: jest.Mocked<QueueService>;
  let player1: PlayerDocument;
  let player2: PlayerDocument;
  let player3: PlayerDocument;
  let mockGame: GameDocument;
  let events: Events;
  let connection: Connection;
  let gameModel: Model<GameDocument>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
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
        QueueService,
        Events,
      ],
    }).compile();

    service = module.get<PlayerSubstitutionService>(PlayerSubstitutionService);
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    queueService = module.get(QueueService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
    gameModel = module.get(getModelToken(Game.name));
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

    mockGame.gameServer = {
      id: 'FAKE_GAME_SERVER_ID',
      provider: 'test',
      name: 'FAKE GAME SERVER',
      address: 'localhost',
      port: 27015,
    };
    await mockGame.save();

    playerBansService.getPlayerActiveBans = () => Promise.resolve([]);
  });

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#substitutePlayer()', () => {
    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(new Types.ObjectId().toString(), player1.id),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });

    describe('when the target player does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(
            mockGame.id,
            new Types.ObjectId().toString(),
          ),
        ).rejects.toThrow(PlayerNotInThisGameError);
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
        ).rejects.toThrow(WrongGameSlotStatusError);
      });
    });

    it('should update the player status', async () => {
      const game = await service.substitutePlayer(mockGame.id, player1.id);
      expect(game.id).toEqual(mockGame.id);
      const slot = game.findPlayerSlot(player1.id);
      expect(slot.status).toEqual(SlotStatus.waitingForSubstitute);
    });

    it('should emit the gameChanges event', async () => {
      let event: Game;
      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.substitutePlayer(mockGame.id, player1.id);
      expect(event).toMatchObject({ id: mockGame.id });
    });

    describe('when the game has already ended', () => {
      beforeEach(async () => {
        await gameModel.findByIdAndUpdate(mockGame.id, {
          state: GameState.ended,
        });
      });

      it('should reject', async () => {
        await expect(
          service.substitutePlayer(mockGame.id, player1.id),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });

    it('should emit the substituteRequested event', async () => {
      let emittedGameId: string;
      let emittedPlayerId: string;
      events.substituteRequested.subscribe(({ gameId, playerId }) => {
        emittedGameId = gameId;
        emittedPlayerId = playerId;
      });

      await service.substitutePlayer(mockGame.id, player1.id);
      expect(emittedGameId).toEqual(mockGame.id);
      expect(emittedPlayerId).toEqual(player1.id);
    });

    it('should do nothing if the player is already marked', async () => {
      const game1 = await service.substitutePlayer(mockGame.id, player1.id);
      const game2 = await service.substitutePlayer(mockGame.id, player1.id);
      expect(game1.id).toEqual(game2.id);
    });
  });

  describe('#cancelSubstitutionRequest()', () => {
    beforeEach(async () => {
      await service.substitutePlayer(mockGame.id, player1.id);
    });

    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(
            new Types.ObjectId().toString(),
            player1.id,
          ),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });

    describe('when the given player does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(
            mockGame.id,
            new Types.ObjectId().toString(),
          ),
        ).rejects.toThrow(PlayerNotInThisGameError);
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(mockGame.id, player1.id),
        ).rejects.toThrow(WrongGameSlotStatusError);
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

    it('should emit the gameChanges event', async () => {
      let event: Game;

      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.cancelSubstitutionRequest(mockGame.id, player1.id);
      expect(event).toMatchObject({ id: mockGame.id });
    });

    describe('when the game is no longer running', () => {
      beforeEach(async () => {
        await gameModel.findByIdAndUpdate(mockGame.id, {
          state: GameState.ended,
        });
      });

      it('should reject', async () => {
        await expect(
          service.cancelSubstitutionRequest(mockGame.id, player1.id),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });

    it('should emit the substituteCanceled event', async () => {
      let emittedGameId: string;
      let emittedPlayerId: string;
      events.substituteRequestCanceled.subscribe(({ gameId, playerId }) => {
        emittedGameId = gameId;
        emittedPlayerId = playerId;
      });

      await service.cancelSubstitutionRequest(mockGame.id, player1.id);
      expect(emittedGameId).toEqual(mockGame.id);
      expect(emittedPlayerId).toEqual(player1.id);
    });
  });

  describe('#replacePlayer()', () => {
    beforeEach(async () => {
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

    it('should emit the gameChanges event', async () => {
      let event: Game;
      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(event).toMatchObject({ id: mockGame.id });
    });

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
        ).rejects.toThrow('player is banned');
      });
    });

    describe('when replacing an active player', () => {
      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player2.id, player3.id),
        ).rejects.toThrow();
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
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame.id, player1.id, player3.id);
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player1.id, player3.id),
        ).rejects.toThrow();
      });
    });

    describe('when the given player is involved in another game', () => {
      beforeEach(async () => {
        player3.activeGame = new Types.ObjectId();
        await player3.save();
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame.id, player1.id, player3.id),
        ).rejects.toThrow('player is involved in a currently running game');
      });
    });

    it('should emit the playerReplaced event', async () => {
      let emittedGameId: string;
      let emittedReplaceeId: string;
      let emittedReplacementId: string;

      events.playerReplaced.subscribe(
        ({ gameId, replaceeId, replacementId }) => {
          emittedGameId = gameId;
          emittedReplaceeId = replaceeId;
          emittedReplacementId = replacementId;
        },
      );

      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(emittedGameId).toEqual(mockGame.id);
      expect(emittedReplaceeId).toEqual(player1.id);
      expect(emittedReplacementId).toEqual(player3.id);
    });

    it('should reject if the replacement player does not exist', async () => {
      await expect(
        service.replacePlayer(
          mockGame.id,
          player1.id,
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(Error.DocumentNotFoundError);
    });

    it('should kick the replacement player from the queue', async () => {
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      expect(queueService.kick).toHaveBeenCalledWith(player3.id);
    });

    it('should assign active game to the replacement player', async () => {
      await service.replacePlayer(mockGame.id, player1.id, player3.id);
      const player = await playersService.getById(player3.id);
      expect(player.activeGame).toEqual(mockGame.id);
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
