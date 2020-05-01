import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillService } from './player-skill.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { PlayersService } from './players.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import * as fs from 'fs';
import { Subject } from 'rxjs';
import { FuturePlayerSkillService } from './future-player-skill.service';

class PlayersServiceStub {
  getById(id: string) { return Promise.resolve(null); }
  getAll() { return Promise.resolve([]); }
  playerRegistered = new Subject<string>();
}

class QueueConfigServiceStub {
  queueConfig = {
    classes: [
      { name: 'soldier' },
    ],
  };
}

class FuturePlayerSkillServiceStub {
  findSkill(steamId: string) { return Promise.resolve(null); }
}

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;
  let mongod: MongoMemoryServer;
  let playerSkillModel: ReturnModelType<typeof PlayerSkill>;
  let mockPlayerId: string;
  let mockPlayerSkill: DocumentType<PlayerSkill>;
  let playersService: PlayersServiceStub;
  let futurePlayerSkillService: FuturePlayerSkillServiceStub;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ PlayerSkill ]),
      ],
      providers: [
        PlayerSkillService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: FuturePlayerSkillService, useClass: FuturePlayerSkillServiceStub },
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
    playerSkillModel = module.get(getModelToken('PlayerSkill'));
    playersService = module.get(PlayersService);
    futurePlayerSkillService = module.get(FuturePlayerSkillService);

    service.onModuleInit();
  });

  beforeEach(async () => {
    mockPlayerId = new ObjectId().toString();
    mockPlayerSkill = await playerSkillModel.create({
      player: mockPlayerId,
      skill: {
        soldier: 4,
      },
    });
  });

  afterEach(async () => await playerSkillModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upon player registration', () => {
    let playerId: string;

    beforeEach(() => {
      playerId = new ObjectId().toString();
      jest.spyOn(playersService, 'getById').mockResolvedValue({ id: playerId, _id: playerId, steamId: 'FAKE_STEAM_ID' });
    });

    describe('when there is no future skill', () => {
      it('should not update player\'s skill', done => {
        playersService.playerRegistered.next(playerId);
        setTimeout(async () => {
          expect(await playerSkillModel.findOne({ player: playerId })).toBe(null);
          done();
        }, 100);
      });
    });

    describe('when there is future skill for the given player', () => {
      beforeEach(() => {
        jest.spyOn(futurePlayerSkillService, 'findSkill').mockResolvedValue({ steamId: 'FAKE_STEAM_ID', skill: new Map([['soldier', 2]]) });
      });

      it('should update player\'s skill', done => {
        playersService.playerRegistered.next(playerId);
        setTimeout(async () => {
          expect(await playerSkillModel.findOne({ player: playerId })).toBeTruthy();
          done();
        }, 100);
      });
    });
  });

  describe('#getAll()', () => {
    it('should retrieve all players skills', async () => {
      const ret = await service.getAll();
      expect(ret.length).toBe(1);
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should retrieve player skill', async () => {
      const ret = await service.getPlayerSkill(mockPlayerId);
      expect(ret.toObject()).toEqual(mockPlayerSkill.toObject());
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should set player skill', async () => {
      const ret = await service.setPlayerSkill(mockPlayerId, new Map([['soldier', 2]]));
      expect(ret.toObject()).toMatchObject({
        skill: new Map([['soldier', 2]]),
      });
    });

    it('should fail if there is no such player', async () => {
      await expect(service.setPlayerSkill(new ObjectId().toString(), new Map([['scout', 1]]))).rejects.toThrowError('no such player');
    });
  });

  describe('#exportPlayerSkills()', () => {
    describe('with players in the database', () => {
      beforeEach(() => {
        jest.spyOn(playersService, 'getAll').mockResolvedValue([
          { id: mockPlayerId, name: 'FAKE_PLAYER_NAME', etf2lProfileId: 12345 },
        ]);
      });

      it('should save all players\' skill to a csv file', async () => {
        const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
        await service.exportPlayerSkills();
        expect(spy).toHaveBeenCalledWith(
          expect.stringMatching(/^player-skills-.+\.csv$/),
          'name,etf2lProfileId,soldier\nFAKE_PLAYER_NAME,12345,4',
        );
      });
    });
  });
});
