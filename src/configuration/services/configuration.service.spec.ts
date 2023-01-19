import { Events } from '@/events/events';
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
  ConfigurationItem,
  ConfigurationItemDocument,
  configurationItemSchema,
} from '../models/configuration-item';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mongod: MongoMemoryServer;
  let configurationItemModel: Model<ConfigurationItemDocument>;
  let connection: Connection;
  let events: Events;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: ConfigurationItem.name,
            schema: configurationItemSchema,
          },
        ]),
      ],
      providers: [ConfigurationService, Events],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configurationItemModel = module.get(getModelToken(ConfigurationItem.name));
    connection = module.get(getConnectionToken());
    events = module.get(Events);
  });

  afterEach(async () => {
    await configurationItemModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
