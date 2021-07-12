import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import {
  ConfigurationEntry,
  ConfigurationEntryDocument,
  configurationEntrySchema,
} from '../models/configuration-entry';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import { MumbleOptions } from '../models/mumble-options';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mongod: MongoMemoryServer;
  let configurationEntryModel: Model<ConfigurationEntryDocument>;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: ConfigurationEntry.name, schema: configurationEntrySchema },
        ]),
      ],
      providers: [ConfigurationService],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configurationEntryModel = module.get(
      getModelToken(ConfigurationEntry.name),
    );
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  afterEach(async () => {
    await configurationEntryModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get default player skill', async () => {
    expect(await service.getDefaultPlayerSkill()).toBeTruthy();
  });

  it('should set default player skill', async () => {
    expect(
      await service.setDefaultPlayerSkill(new Map([[Tf2ClassName.soldier, 3]])),
    ).toBeTruthy();
  });

  it('should get whitelist id', async () => {
    expect(await service.getWhitelistId()).toEqual('');
  });

  it('should set whitelist id', async () => {
    expect(await service.setWhitelistId('etf2l_6v6')).toEqual('etf2l_6v6');
  });

  it('should return whether etf2l account is required', async () => {
    expect(await service.isEtf2lAccountRequired()).toBe(true);
  });

  it('should set whether etf2l account is required', async () => {
    expect(await service.setEtf2lAccountRequired(false)).toBe(false);
  });

  it('should return minimum tf2 in-game hours', async () => {
    expect(await service.getMinimumTf2InGameHours()).toEqual(500);
  });

  it('should set minimum tf2 in-game hours', async () => {
    expect(await service.setMinimumTf2InGameHours(1000)).toEqual(1000);
  });

  it('should set voice server', async () => {
    const voiceServer: MumbleOptions = {
      type: 'mumble',
      url: 'melkor.tf',
      port: 64738,
    };
    expect(await service.setVoiceServer(voiceServer)).toEqual(voiceServer);
  });

  it('should retrieve voice server', async () => {
    const voiceServer: MumbleOptions = {
      type: 'mumble',
      url: 'melkor.tf',
      port: 64738,
    };
    await configurationEntryModel.updateOne(
      { key: ConfigurationEntryKey.voiceServer },
      { value: JSON.stringify(voiceServer) },
      { upsert: true },
    );
    expect(await service.getVoiceServer()).toEqual(voiceServer);
  });
});
