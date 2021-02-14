import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TypegooseModule } from 'nestjs-typegoose';
import { Configuration } from '../models/configuration';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mongod: MongoMemoryServer;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([{
          typegooseClass: Configuration,
          schemaOptions: {
            collection: 'configuration',
            capped: { size: 1024, max: 1 },
          },
        }]),
      ],
      providers: [
        ConfigurationService,
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getConfiguration()', () => {
    it('should return the default configuration', async () => {
      expect(await service.getConfiguration()).toBeTruthy();
    });
  });

  describe('#setConfiguration()', () => {
    let configuration: Configuration;

    beforeEach(() => {
      configuration = {
        defaultPlayerSkill: 3,
        whitelistId: '12345',
      };
    });

    it('should save the configuration', async () => {
      const ret = await service.setConfiguration(configuration);
      expect(ret).toMatchObject(configuration);
      expect(await service.getConfiguration()).toMatchObject(configuration);
    });
  });
});
