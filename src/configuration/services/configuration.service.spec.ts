import { Tf2ClassName } from '@/shared/models/tf2-class-name';
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
      const configuration = await service.getConfiguration();
      expect(configuration).toBeTruthy();
      expect(configuration.defaultPlayerSkill.size).toEqual(9);
    });
  });

  describe('#setConfiguration()', () => {
    let configuration: Configuration;

    beforeEach(() => {
      configuration = {
        defaultPlayerSkill: new Map([[Tf2ClassName.soldier, 3]]),
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
