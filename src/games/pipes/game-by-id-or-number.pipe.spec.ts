import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import { Game, GameDocument, gameSchema } from '../models/game';
import { GamesService } from '../services/games.service';
import { GameByIdOrNumberPipe } from './game-by-id-or-number.pipe';
// eslint-disable-next-line jest/no-mocks-import
import { GamesService as MockGamesService } from '../services/__mocks__/games.service';
import { Events } from '@/events/events';
import { NotFoundException } from '@nestjs/common';

jest.mock('../services/games.service');

describe('GameByIdOrNumberPipe', () => {
  let pipe: GameByIdOrNumberPipe;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let gamesService: MockGamesService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Game.name,
            schema: gameSchema,
          },
        ]),
      ],
      providers: [GamesService, Events],
    }).compile();

    gamesService = module.get(GamesService);
    pipe = new GameByIdOrNumberPipe(gamesService as unknown as GamesService);
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await gamesService._reset();
    await connection.close();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('#transform()', () => {
    let game: GameDocument;

    beforeEach(async () => {
      game = await gamesService._createOne();
    });

    describe('when providing a valid id', () => {
      it('should return game', async () => {
        expect((await pipe.transform(game.id)).id).toEqual(game.id);
      });
    });

    describe('when using game number', () => {
      it('should return game', async () => {
        expect((await pipe.transform(`${game.number}`)).id).toEqual(game.id);
      });
    });

    describe('when using an invalid number', () => {
      it('should throw', async () => {
        await expect(pipe.transform('dupa13')).rejects.toThrow(
          NotFoundException,
        );
        await expect(pipe.transform('123a')).rejects.toThrow(NotFoundException);
        await expect(pipe.transform('5')).rejects.toThrow(NotFoundException);
        await expect(
          pipe.transform(new Types.ObjectId().toString()),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
