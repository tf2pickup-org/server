import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  PlayerPreferences,
  PlayerPreferencesDocument,
  playerPreferencesSchema,
} from '../models/player-preferences';
import { PlayerPreferencesService } from './player-preferences.service';
import { ObjectId } from 'mongodb';
import { Connection, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';

describe('PlayerPreferencesService', () => {
  let service: PlayerPreferencesService;
  let mongod: MongoMemoryServer;
  let playerPreferencesModel: Model<PlayerPreferencesDocument>;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: PlayerPreferences.name,
            schema: playerPreferencesSchema,
          },
        ]),
      ],
      providers: [PlayerPreferencesService],
    }).compile();

    service = module.get<PlayerPreferencesService>(PlayerPreferencesService);
    playerPreferencesModel = module.get(getModelToken(PlayerPreferences.name));
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await playerPreferencesModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getPlayerPreferences()', () => {
    describe('when initializing preferences', () => {
      it('should return an empty map', async () => {
        const playerId = new ObjectId().toString();
        const ret = await service.getPlayerPreferences(playerId);
        expect(ret).toEqual(new Map());
      });
    });

    describe('when player has saved preferences', () => {
      const preferences = new Map([['sound-volume', '0.7']]);
      let playerId: string;

      beforeEach(async () => {
        playerId = new ObjectId().toString();
        await playerPreferencesModel.create({ player: playerId, preferences });
      });

      it('should return preferences', async () => {
        const ret = await service.getPlayerPreferences(playerId);
        expect(ret.size).toEqual(preferences.size);
        expect(ret.get('sound-volume')).toEqual('0.7');
      });
    });
  });

  describe('#updatePlayerPreferences()', () => {
    let playerId: string;

    beforeEach(() => {
      playerId = new ObjectId().toString();
    });

    describe('when saving for the first time', () => {
      it('should upsert', async () => {
        const prefs = await service.updatePlayerPreferences(
          playerId,
          new Map([['sound-volume', '0.7']]),
        );
        expect(prefs.size).toEqual(1);
        expect(prefs.get('sound-volume')).toEqual('0.7');
        expect(
          await playerPreferencesModel.findOne({ player: playerId }),
        ).toBeTruthy();
      });
    });

    describe('when updating', () => {
      let preferences: Map<string, string>;

      beforeEach(async () => {
        preferences = new Map([['sound-volume', '1.0']]);
        await playerPreferencesModel.create({ player: playerId, preferences });
      });

      it('should update', async () => {
        preferences.set('sound-pack', 'default');
        preferences.set('sound-volume', '0.6');
        const prefs = await service.updatePlayerPreferences(
          playerId,
          preferences,
        );
        expect(prefs.size).toEqual(2);
        expect(prefs.get('sound-volume')).toEqual('0.6');
        expect(prefs.get('sound-pack')).toEqual('default');
      });
    });
  });
});
