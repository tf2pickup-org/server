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
import { PlayerId } from '@/players/types/player-id';
import { GameId } from '../game-id';
import { GameEventType } from '../models/game-event-type';
import { SubstituteRequested } from '../models/events/substitute-requested';
import { PlayerReplaced } from '../models/events/player-replaced';
import { PlayerDeniedError } from '@/shared/errors/player-denied.error';

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
          service.substitutePlayer(new Types.ObjectId() as GameId, player1._id),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });

    describe('when the target player does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(
            mockGame._id,
            new Types.ObjectId() as PlayerId,
          ),
        ).rejects.toThrow(PlayerNotInThisGameError);
      });
    });

    describe('when the target player has already been replaced', () => {
      beforeEach(async () => {
        await service.substitutePlayer(mockGame._id, player1._id);
        await service.replacePlayer(mockGame._id, player1._id, player3._id);
      });

      it('should throw an error', async () => {
        await expect(
          service.substitutePlayer(mockGame._id, player1._id),
        ).rejects.toThrow(WrongGameSlotStatusError);
      });
    });

    it('should update the player status', async () => {
      const game = await service.substitutePlayer(mockGame._id, player1._id);
      expect(game._id).toEqual(mockGame._id);
      const slot = game.findPlayerSlot(player1._id);
      expect(slot?.status).toEqual(SlotStatus.waitingForSubstitute);
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.substitutePlayer(mockGame._id, player1._id);
      expect(event?._id.equals(mockGame._id)).toBe(true);
    });

    it('should register event', async () => {
      const game = await service.substitutePlayer(mockGame._id, player1._id);
      expect(
        game.events.find(
          (event) =>
            event.event === GameEventType.substituteRequested &&
            (event as SubstituteRequested).player.equals(player1._id),
        ),
      ).toBeTruthy();
    });

    describe('when the game has already ended', () => {
      beforeEach(async () => {
        await gameModel.findByIdAndUpdate(mockGame._id, {
          state: GameState.ended,
        });
      });

      it('should reject', async () => {
        await expect(
          service.substitutePlayer(mockGame._id, player1._id),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });

    it('should emit the substituteRequested event', async () => {
      let emittedGameId: GameId | undefined;
      let emittedPlayerId: PlayerId | undefined;
      events.substituteRequested.subscribe(({ gameId, playerId }) => {
        emittedGameId = gameId;
        emittedPlayerId = playerId;
      });

      await service.substitutePlayer(mockGame._id, player1._id);
      expect(emittedGameId).toEqual(mockGame._id);
      expect(emittedPlayerId).toEqual(player1._id);
    });

    it('should do nothing if the player is already marked', async () => {
      const game1 = await service.substitutePlayer(mockGame._id, player1._id);
      const game2 = await service.substitutePlayer(mockGame._id, player1._id);
      expect(game1._id).toEqual(game2._id);
    });
  });

  describe('#cancelSubstitutionRequest()', () => {
    beforeEach(async () => {
      await service.substitutePlayer(mockGame._id, player1._id);
    });

    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(
            new Types.ObjectId() as GameId,
            player1._id,
          ),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });

    describe('when the given player does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(
            mockGame._id,
            new Types.ObjectId() as PlayerId,
          ),
        ).rejects.toThrow(PlayerNotInThisGameError);
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame._id, player1._id, player3._id);
      });

      it('should throw an error', async () => {
        await expect(
          service.cancelSubstitutionRequest(mockGame._id, player1._id),
        ).rejects.toThrow(WrongGameSlotStatusError);
      });
    });

    it('should update the player status', async () => {
      const game = await service.cancelSubstitutionRequest(
        mockGame._id,
        player1._id,
      );
      const slot = game.findPlayerSlot(player1._id);
      expect(slot?.status).toEqual(SlotStatus.active);
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;

      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.cancelSubstitutionRequest(mockGame._id, player1._id);
      expect(event?._id.equals(mockGame._id)).toBe(true);
    });

    describe('when the game is no longer running', () => {
      beforeEach(async () => {
        await gameModel.findByIdAndUpdate(mockGame._id, {
          state: GameState.ended,
        });
      });

      it('should reject', async () => {
        await expect(
          service.cancelSubstitutionRequest(mockGame._id, player1._id),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });

    it('should emit the substituteCanceled event', async () => {
      let emittedGameId: GameId | undefined;
      let emittedPlayerId: PlayerId | undefined;
      events.substituteRequestCanceled.subscribe(({ gameId, playerId }) => {
        emittedGameId = gameId;
        emittedPlayerId = playerId;
      });

      await service.cancelSubstitutionRequest(mockGame._id, player1._id);
      expect(emittedGameId).toEqual(mockGame._id);
      expect(emittedPlayerId).toEqual(player1._id);
    });
  });

  describe('#replacePlayer()', () => {
    beforeEach(async () => {
      await service.substitutePlayer(mockGame._id, player1._id);
    });

    it('should replace the player', async () => {
      // replace player 1 with player 3
      const game = await service.replacePlayer(
        mockGame._id,
        player1._id,
        player3._id,
      );
      expect(game._id).toEqual(mockGame._id);
      const replaceeSlot = game.findPlayerSlot(player1._id);
      expect(replaceeSlot?.status).toEqual(SlotStatus.replaced);
      const replacementSlot = game.findPlayerSlot(player3._id);
      expect(replacementSlot).toBeTruthy();
      expect(replacementSlot?.status).toEqual(SlotStatus.active);
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.replacePlayer(mockGame._id, player1._id, player3._id);
      expect(event?._id.equals(mockGame._id)).toBe(true);
    });

    describe('when replacing an active player', () => {
      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame._id, player2._id, player3._id),
        ).rejects.toThrow();
      });
    });

    describe('when a player is subbing himself', () => {
      it('should mark the slot back as active', async () => {
        const game = await service.replacePlayer(
          mockGame._id,
          player1._id,
          player1._id,
        );
        expect(game._id).toEqual(mockGame._id);
        const slot = game.findPlayerSlot(player1._id);
        expect(slot?.status).toBe(SlotStatus.active);
        expect(game.slots.length).toBe(2);
      });

      it('should register event', async () => {
        const game = await service.replacePlayer(
          mockGame._id,
          player1._id,
          player1._id,
        );
        expect(
          game.events.find(
            (e) =>
              e.event === GameEventType.playerReplaced &&
              (e as PlayerReplaced).replacee.equals(player1._id) &&
              (e as PlayerReplaced).replacement.equals(player1._id),
          ),
        ).toBeTruthy();
      });
    });

    describe('when the given player has already been replaced', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame._id, player1._id, player3._id);
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame._id, player1._id, player3._id),
        ).rejects.toThrow();
      });
    });

    describe('when the given player is involved in another game', () => {
      beforeEach(async () => {
        player3.activeGame = new Types.ObjectId() as GameId;
        await player3.save();
      });

      it('should reject', async () => {
        await expect(
          service.replacePlayer(mockGame._id, player1._id, player3._id),
        ).rejects.toThrow(PlayerDeniedError);
      });
    });

    it('should emit the playerReplaced event', async () => {
      let emittedGameId: GameId | undefined;
      let emittedReplaceeId: PlayerId | undefined;
      let emittedReplacementId: PlayerId | undefined;

      events.playerReplaced.subscribe(
        ({ gameId, replaceeId, replacementId }) => {
          emittedGameId = gameId;
          emittedReplaceeId = replaceeId;
          emittedReplacementId = replacementId;
        },
      );

      await service.replacePlayer(mockGame._id, player1._id, player3._id);
      expect(emittedGameId).toEqual(mockGame._id);
      expect(emittedReplaceeId).toEqual(player1._id);
      expect(emittedReplacementId).toEqual(player3._id);
    });

    it('should reject if the replacement player does not exist', async () => {
      await expect(
        service.replacePlayer(
          mockGame._id,
          player1._id,
          new Types.ObjectId() as PlayerId,
        ),
      ).rejects.toThrow(Error.DocumentNotFoundError);
    });

    it('should kick the replacement player from the queue', async () => {
      await service.replacePlayer(mockGame._id, player1._id, player3._id);
      expect(queueService.kick).toHaveBeenCalledWith(player3._id);
    });

    it('should assign active game to the replacement player', async () => {
      await service.replacePlayer(mockGame._id, player1._id, player3._id);
      const player = await playersService.getById(player3._id);
      expect(player.activeGame?.equals(mockGame._id)).toBe(true);
    });

    it("should remove player's active game", async () => {
      await service.replacePlayer(mockGame._id, player1._id, player3._id);
      const player = await playersService.getById(player1._id);
      expect(player.activeGame).toBe(undefined);
    });

    it('should register event', async () => {
      const game = await service.replacePlayer(
        mockGame._id,
        player1._id,
        player3._id,
      );
      expect(
        game.events.find(
          (e) =>
            e.event === GameEventType.playerReplaced &&
            (e as PlayerReplaced).replacee.equals(player1._id) &&
            (e as PlayerReplaced).replacement.equals(player3._id),
        ),
      ).toBeTruthy();
    });

    describe('when a player1 gets replaced, but then player2 leaves', () => {
      beforeEach(async () => {
        await service.replacePlayer(mockGame._id, player1._id, player3._id);
        await service.substitutePlayer(mockGame._id, player2._id);
      });

      it("player1 should be able to take player2's slot", async () => {
        const game = await service.replacePlayer(
          mockGame._id,
          player2._id,
          player1._id,
        );
        expect(
          game.slots.filter(
            (s) => s.player.toString().localeCompare(player1._id) === 0,
          ).length,
        ).toEqual(1);
      });
    });
  });
});
