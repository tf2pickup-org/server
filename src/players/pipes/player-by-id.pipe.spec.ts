import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { Player, PlayerDocument, playerSchema } from '../models/player';
import { PlayersService } from '../services/players.service';
import { PlayerByIdPipe } from './player-by-id.pipe';

jest.mock('../services/players.service');

describe('PlayerByIdPipe', () => {
  let pipe: PlayerByIdPipe;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: PlayersService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => mongod.stop());

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
    pipe = new PlayerByIdPipe(playersService);
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('given a valid object id', () => {
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
    });

    it('should fetch the player by id', async () => {
      const p = await pipe.transform(player.id);
      expect(p.id).toEqual(player.id);
    });
  });

  describe('given a valid steam id', () => {
    let player: PlayerDocument;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
      player.steamId = '76561198074409147';
      await player.save();
    });

    it('should fetch the player by steam id', async () => {
      const p = await pipe.transform(player.steamId);
      expect(p.id).toEqual(player.id);
    });
  });
});
