import { Events } from '@/events/events';
import { Test, TestingModule } from '@nestjs/testing';
import { ReturnModelType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MapPoolService } from './map-pool.service';
import { Map } from '../models/map';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';

describe('MapPoolService', () => {
  let service: MapPoolService;
  let mongod: MongoMemoryServer;
  let mapModel: ReturnModelType<typeof Map>;
  let events: Events;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Map]),
      ],
      providers: [
        MapPoolService,
        Events,
      ],
    }).compile();

    service = module.get<MapPoolService>(MapPoolService);
    mapModel = module.get(getModelToken(Map.name));
    events = module.get(Events);
  });

  afterEach(async () => {
    await mapModel.deleteMany({ });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    describe('when there are no maps in the pool', () => {
      it('should set the default map pool', async () => {
        await service.onModuleInit();
        expect(await mapModel.countDocuments()).toBeGreaterThan(0);
      });
    });

    describe('when there are maps in the pool already', () => {
      beforeEach(async () => {
        await mapModel.create({ name: 'cp_badlands' });
      });

      it('should not alter the map pool', async () => {
        await service.onModuleInit();
        expect(await mapModel.countDocuments()).toBeGreaterThan(0);
      });

      it('should set the maps property', async () => {
        await service.onModuleInit();
        expect(service.maps).toMatchObject([ { name: 'cp_badlands', cooldown: 0 } ]);
      });

      it('should emit an event', async () => new Promise<void>(resolve => {
        events.mapPoolChange.subscribe(({ maps }) => {
          expect(maps).toMatchObject([ { name: 'cp_badlands', cooldown: 0 } ]);
          resolve();
        });

        service.onModuleInit();
      }));
    });
  });
});
