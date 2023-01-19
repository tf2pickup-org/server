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
import { z } from 'zod';
import { configurationEntry } from '../configuration-entry';
import { ConfigurationEntryNotFoundError } from '../errors/configuration-entry-not-found.error';
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

  it('should handle strings', async () => {
    service.register(
      configurationEntry('test.test_entry', z.string(), 'FAKE_DEFAULT_VALUE'),
    );

    expect(await service.get<string>('test.test_entry')).toEqual(
      'FAKE_DEFAULT_VALUE',
    );
    expect(await service.set<string>('test.test_entry', 'NEW_VALUE')).toEqual(
      'NEW_VALUE',
    );
    expect(await service.get<string>('test.test_entry')).toEqual('NEW_VALUE');
    expect(await service.reset<string>('test.test_entry')).toEqual(
      'FAKE_DEFAULT_VALUE',
    );
    expect(await service.get<string>('test.test_entry')).toEqual(
      'FAKE_DEFAULT_VALUE',
    );
  });

  it('should handle numbers', async () => {
    service.register(configurationEntry('test.test_entry', z.number(), 42));

    expect(await service.get<number>('test.test_entry')).toEqual(42);
    expect(await service.set<number>('test.test_entry', 43)).toEqual(43);
    expect(await service.get<number>('test.test_entry')).toEqual(43);
    expect(await service.reset<number>('test.test_entry')).toEqual(42);
    expect(await service.get<number>('test.test_entry')).toEqual(42);
  });

  it('should handle objects', async () => {
    const schema = z.object({
      foo: z.string(),
      bar: z.number().optional(),
    });
    type TestObjectType = z.infer<typeof schema>;

    service.register(
      configurationEntry('test.test_entry', schema, { foo: 'foo' }),
    );

    expect(await service.get<TestObjectType>('test.test_entry')).toEqual({
      foo: 'foo',
    });
    expect(
      await service.set<TestObjectType>('test.test_entry', {
        foo: 'bar',
        bar: 128,
      }),
    ).toEqual({ foo: 'bar', bar: 128 });
    expect(await service.get<TestObjectType>('test.test_entry')).toEqual({
      foo: 'bar',
      bar: 128,
    });
    expect(await service.reset<TestObjectType>('test.test_entry')).toEqual({
      foo: 'foo',
    });
    expect(await service.get<TestObjectType>('test.test_entry')).toEqual({
      foo: 'foo',
    });
  });

  describe('#get()', () => {
    it('should throw when trying to access an unregistered value', async () => {
      await expect(service.get('not.existent')).rejects.toThrow(
        ConfigurationEntryNotFoundError,
      );
    });
  });

  describe('#set()', () => {
    beforeEach(() => {
      service.register(
        configurationEntry('test.test_entry', z.string(), 'FAKE_DEFAULT_VALUE'),
      );
    });

    it('should throw when schema rejects the value', async () => {
      await expect(service.set('test.test_entry', 42)).rejects.toThrow();
    });
  });

  describe('#describe()', () => {
    beforeEach(() => {
      service.register(
        configurationEntry('test.test_entry', z.string(), 'FAKE_DEFAULT_VALUE'),
      );
    });

    it('should describe the entry', async () => {
      expect(await service.describe('test.test_entry')).toEqual({
        key: 'test.test_entry',
        schema: { type: 'string' },
        value: 'FAKE_DEFAULT_VALUE',
        defaultValue: 'FAKE_DEFAULT_VALUE',
      });
    });
  });

  describe('#describeAll()', () => {
    beforeEach(() => {
      service.register(
        configurationEntry('test.test_entry', z.string(), 'FAKE_DEFAULT_VALUE'),
        configurationEntry('test.another_entry', z.number(), 42),
      );
    });

    it('should describe all entries', async () => {
      expect(await service.describeAll()).toEqual([
        {
          key: 'test.test_entry',
          schema: { type: 'string' },
          value: 'FAKE_DEFAULT_VALUE',
          defaultValue: 'FAKE_DEFAULT_VALUE',
        },
        {
          key: 'test.another_entry',
          schema: { type: 'number' },
          value: 42,
          defaultValue: 42,
        },
      ]);
    });
  });
});
