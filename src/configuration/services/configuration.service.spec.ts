import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { ReturnModelType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { ConfigurationEntry } from '../models/configuration-entry';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mongod: MongoMemoryServer;
  let configurationEntryModel: ReturnModelType<typeof ConfigurationEntry>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ConfigurationEntry]),
      ],
      providers: [
        ConfigurationService,
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configurationEntryModel = module.get(getModelToken(ConfigurationEntry.name));
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  afterEach(async () => {
    await configurationEntryModel.deleteMany({ });
  })

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get default player skill', async () => {
    expect(await service.getDefaultPlayerSkill()).toBeTruthy();
  });

  it('should set default player skill', async () => {
    expect(await service.setDefaultPlayerSkill(new Map([[Tf2ClassName.soldier, 3]]))).toBeTruthy();
  });

  it('should get whitelist id', async () => {
    expect(await service.getWhitelistId()).toEqual('');
  });

  it('should set whitelist id', async () => {
    expect(await service.setWhitelistId('etf2l_6v6')).toEqual('etf2l_6v6');
  });

});
