import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import { Player, PlayerDocument, playerSchema } from '../models/player';
import { PlayersService } from '../services/players.service';
import { PlayerByIdPipe } from './player-by-id.pipe';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as MockedPlayersService } from '../services/__mocks__/players.service';

jest.mock('../services/players.service');

describe('PlayerByIdPipe', () => {
  let pipe: PlayerByIdPipe;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: MockedPlayersService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
      ],
      providers: [PlayersService],
    }).compile();

    playersService = module.get(PlayersService);
    pipe = new PlayerByIdPipe(playersService as unknown as PlayersService);
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('given a valid object id', () => {
    let player: Player;

    beforeEach(async () => {
      player = await playersService._createOne();
    });

    it('should fetch the player by id', async () => {
      const ret = await pipe.transform(player.id);
      expect(ret?.id).toEqual(player.id);
    });
  });

  describe('given a valid steam id', () => {
    let player: PlayerDocument;

    beforeEach(async () => {
      player = await playersService._createOne();
      player.steamId = '76561198074409147';
      await player.save();
    });

    it('should fetch the player by steam id', async () => {
      const ret = await pipe.transform(player.steamId);
      expect(ret?.id).toEqual(player.id);
    });
  });

  describe('given an id of non-existing player', () => {
    let playerId: string;

    beforeEach(() => {
      playerId = new Types.ObjectId().toString();
    });

    it('should throw a 404 error', async () => {
      await expect(() => pipe.transform(playerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('given an invalid id', () => {
    it('should throw a 400 error', async () => {
      await expect(() => pipe.transform('invalidsteamid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
