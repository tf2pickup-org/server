import { Events } from '@/events/events';
import { GameId } from '@/games/types/game-id';
import { Game, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
import { Player, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { waitABit } from '@/utils/wait-a-bit';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import {
  PlayerActionEntry,
  playerActionEntrySchema,
} from '../models/player-action-entry';
import { PlayerActionLoggerService } from './player-action-logger.service';

jest.mock('@/games/services/games.service');
jest.mock('@/players/services/players.service');

describe('PlayerActionLoggerService', () => {
  let service: PlayerActionLoggerService;
  let mongod: MongoMemoryServer;
  let playerActionEntryModel: Model<PlayerActionEntry>;
  let connection: Connection;
  let gamesService: GamesService;
  let playersService: PlayersService;
  let events: Events;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: PlayerActionEntry.name, schema: playerActionEntrySchema },
          { name: Game.name, schema: gameSchema },
          { name: Player.name, schema: playerSchema },
        ]),
      ],
      providers: [
        PlayerActionLoggerService,
        Events,
        PlayersService,
        GamesService,
      ],
    }).compile();

    service = module.get<PlayerActionLoggerService>(PlayerActionLoggerService);
    playerActionEntryModel = module.get(getModelToken(PlayerActionEntry.name));
    connection = module.get(getConnectionToken());
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    events = module.get(Events);
  });

  beforeEach(() => service.onModuleInit());

  afterEach(async () => {
    await playerActionEntryModel.deleteMany({});
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when player joins game server', () => {
    let game: Game;
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      game = await gamesService._createOne();
      // @ts-expect-error
      player = await playersService._createOne();

      events.playerJoinedGameServer.next({
        gameId: game._id,
        steamId: player.steamId,
        ipAddress: '127.0.0.1',
      });

      await waitABit(100);
    });

    it('should log', async () => {
      const entry = await playerActionEntryModel.findOne().orFail();
      expect(entry.player.equals(player._id)).toBe(true);
      expect(entry.ipAddress).toEqual('127.0.0.1');
      expect(entry.action).toEqual('connected to gameserver (game #1)');
    });
  });

  describe('when player comes online', () => {
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();

      events.playerConnects.next({
        playerId: player._id,
        metadata: {
          ipAddress: '127.0.0.1',
        },
      });

      await waitABit(100);
    });

    it('should log', async () => {
      const entry = await playerActionEntryModel.findOne().orFail();
      expect(entry.player.equals(player._id)).toBe(true);
      expect(entry.ipAddress).toEqual('127.0.0.1');
      expect(entry.action).toEqual('went online');
    });
  });

  describe('when player says in game chat', () => {
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();

      events.playerSaidInGameChat.next({
        gameId: new Types.ObjectId() as GameId,
        steamId: player.steamId,
        message: 'FAKE_MESSAGE',
      });

      await waitABit(100);
    });

    it('should log', async () => {
      const entry = await playerActionEntryModel.findOne().orFail();
      expect(entry.player.equals(player._id)).toBe(true);
      expect(entry.action).toEqual('said "FAKE_MESSAGE"');
    });
  });
});
