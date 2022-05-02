import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { QueueSlot } from '../queue-slot';
import { PlayerPopulatorService } from './player-populator.service';
import { plainToInstance } from 'class-transformer';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

jest.mock('@/players/services/players.service');

describe('PlayerPopulatorService', () => {
  let service: PlayerPopulatorService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let mockPlayer: PlayerDocument;
  let connection: Connection;

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
      providers: [PlayerPopulatorService, PlayersService],
    }).compile();

    service = module.get<PlayerPopulatorService>(PlayerPopulatorService);
    playersService = module.get(PlayersService);
    connection = module.get(getConnectionToken());
  });

  beforeEach(async () => {
    // @ts-expect-error
    mockPlayer = await playersService._createOne();
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#populatePlayer()', () => {
    describe('when the playerId is null', () => {
      it('should return the unchanged slot', async () => {
        const slot: QueueSlot = {
          id: 3,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: null,
        };
        expect(await service.populatePlayer(slot)).toEqual({
          ...slot,
          player: null,
        });
      });
    });

    describe('when the playerId is defined', () => {
      it('should populate the player', async () => {
        const slot: QueueSlot = {
          id: 3,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: mockPlayer.id,
        };
        const player = await playersService.getById(mockPlayer.id);
        expect(await service.populatePlayer(slot)).toEqual({
          ...slot,
          player,
        });
      });
    });
  });

  describe('#populatePlayers', () => {
    it('should populate players in the array', async () => {
      const slots: QueueSlot[] = [
        {
          id: 0,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: null,
        },
        {
          id: 1,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: mockPlayer.id,
        },
      ];

      const player = await playersService.getById(mockPlayer.id);
      expect(await service.populatePlayers(slots)).toEqual([
        {
          id: 0,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: null,
          player: null,
        },
        {
          id: 1,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: mockPlayer.id,
          player,
        },
      ]);
    });
  });
});
