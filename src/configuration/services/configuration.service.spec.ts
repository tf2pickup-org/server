import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import {
  ConfigurationEntry,
  ConfigurationEntryDocument,
  configurationEntrySchema,
} from '../models/configuration-entry';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import {
  DefaultPlayerSkill,
  defaultPlayerSkillSchema,
} from '../models/default-player-skill';
import {
  Etf2lAccountRequired,
  etf2lAccountRequiredSchema,
} from '../models/etf2l-account-required';
import {
  MinimumTf2InGameHours,
  minimumTf2InGameHoursSchema,
} from '../models/minimum-tf2-in-game-hours';
import {
  MumbleOptions,
  SelectedVoiceServer,
  VoiceServer,
  voiceServerSchema,
} from '../models/voice-server';
import { WhitelistId, whitelistIdSchema } from '../models/whitelist-id';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mongod: MongoMemoryServer;
  let configurationEntryModel: Model<ConfigurationEntryDocument>;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: ConfigurationEntry.name,
            schema: configurationEntrySchema,
            discriminators: [
              {
                name: ConfigurationEntryKey.defaultPlayerSkill,
                schema: defaultPlayerSkillSchema,
              },
              {
                name: ConfigurationEntryKey.whitelistId,
                schema: whitelistIdSchema,
              },
              {
                name: ConfigurationEntryKey.etf2lAccountRequired,
                schema: etf2lAccountRequiredSchema,
              },
              {
                name: ConfigurationEntryKey.minimumTf2InGameHours,
                schema: minimumTf2InGameHoursSchema,
              },
              {
                name: ConfigurationEntryKey.voiceServer,
                schema: voiceServerSchema,
              },
            ],
          },
        ]),
      ],
      providers: [ConfigurationService],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configurationEntryModel = module.get(
      getModelToken(ConfigurationEntry.name),
    );
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await configurationEntryModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get default player skill', async () => {
    expect(await service.getDefaultPlayerSkill()).toBeTruthy();
  });

  it('should set default player skill', async () => {
    const defaultPlayerSkill = new DefaultPlayerSkill();
    defaultPlayerSkill.value = new Map([[Tf2ClassName.soldier, 3]]);
    await service.set(defaultPlayerSkill);
    const ret = await service.getDefaultPlayerSkill();
    expect(ret.value.get(Tf2ClassName.soldier)).toEqual(3);
  });

  it('should get default whitelist id', async () => {
    expect((await service.getWhitelistId()).value).toEqual('');
  });

  it('should set whitelist id', async () => {
    const whitelistId = new WhitelistId('etf2l_6v6');
    await service.set(whitelistId);
    const ret = await service.getWhitelistId();
    expect(ret.value).toEqual('etf2l_6v6');
  });

  it('should return whether etf2l account is required', async () => {
    expect((await service.isEtf2lAccountRequired()).value).toBe(true);
  });

  it('should set whether etf2l account is required', async () => {
    const etf2lAccountRequired = new Etf2lAccountRequired(false);
    await service.set(etf2lAccountRequired);
    const ret = await service.isEtf2lAccountRequired();
    expect(ret.value).toBe(false);
  });

  it('should return minimum tf2 in-game hours', async () => {
    expect((await service.getMinimumTf2InGameHours()).value).toEqual(500);
  });

  it('should set minimum tf2 in-game hours', async () => {
    const minimumTf2InGameHours = new MinimumTf2InGameHours(1000);
    await service.set(minimumTf2InGameHours);
    const ret = await service.getMinimumTf2InGameHours();
    expect(ret.value).toEqual(1000);
  });

  it('should get default voice server', async () => {
    expect((await service.getVoiceServer()).type).toEqual(
      SelectedVoiceServer.none,
    );
  });

  it('should set voice server', async () => {
    const voiceServer = new VoiceServer();
    voiceServer.type = SelectedVoiceServer.mumble;

    const mumbleOptions = new MumbleOptions();
    mumbleOptions.url = 'melkor.tf';
    mumbleOptions.port = 64738;
    voiceServer.mumble = mumbleOptions;

    await service.set(voiceServer);

    const ret = await service.getVoiceServer();
    expect(ret.type).toEqual(SelectedVoiceServer.mumble);
    expect(ret.mumble).toEqual(mumbleOptions);
  });
});
