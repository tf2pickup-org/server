import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TypegooseModule } from 'nestjs-typegoose';
import { QueueSlot } from '../queue-slot';
import { PlayerPopulatorService } from './player-populator.service';
import { DocumentType } from '@typegoose/typegoose';
import { plainToClass } from 'class-transformer';

jest.mock('@/players/services/players.service');

describe('PlayerPopulatorService', () => {
  let service: PlayerPopulatorService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let mockPlayer: DocumentType<Player>;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Player]),
      ],
      providers: [PlayerPopulatorService, PlayersService],
    }).compile();

    service = module.get<PlayerPopulatorService>(PlayerPopulatorService);
    playersService = module.get(PlayersService);
  });

  beforeEach(async () => {
    // @ts-expect-error
    mockPlayer = await playersService._createOne();
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
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
        expect(await service.populatePlayer(slot)).toEqual({
          ...slot,
          player: plainToClass(Player, mockPlayer.toObject()),
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
          player: plainToClass(Player, mockPlayer.toObject()),
        },
      ]);
    });
  });
});
