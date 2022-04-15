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
  ServemeTfConfiguration,
  ServemeTfConfigurationDocument,
  servemeTfConfigurationSchema,
} from '../models/serveme-tf-configuration';
import { ServemeTfApiEndpoint } from '../models/serveme-tf-endpoint';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';

describe('ServemeTfConfigurationService', () => {
  let service: ServemeTfConfigurationService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let servemeTfConfigurationModel: Model<ServemeTfConfigurationDocument>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: ServemeTfConfiguration.name,
            schema: servemeTfConfigurationSchema,
          },
        ]),
      ],
      providers: [ServemeTfConfigurationService],
    }).compile();

    service = module.get<ServemeTfConfigurationService>(
      ServemeTfConfigurationService,
    );
    connection = module.get(getConnectionToken());
    servemeTfConfigurationModel = module.get(
      getModelToken(ServemeTfConfiguration.name),
    );
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  afterEach(async () => {
    await servemeTfConfigurationModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a default configuration', async () => {
    const c = await servemeTfConfigurationModel.findOne();
    expect(c).toBeTruthy();
    expect(c.apiEndpointUrl).toEqual(ServemeTfApiEndpoint.servemeTf);
    expect(c.preferredRegion).toBe(undefined);
  });

  describe('#getConfiguration()', () => {
    it('should return the configuration', async () => {
      const c = await service.getConfiguration();
      expect(c).toMatchObject({
        key: 'serveme-tf',
        apiEndpointUrl: ServemeTfApiEndpoint.servemeTf,
      });
    });
  });

  describe('#getApiEndpointUrl()', () => {
    it('should return the api endpoint url', async () => {
      expect(await service.getApiEndpointUrl()).toEqual(
        ServemeTfApiEndpoint.servemeTf,
      );
    });
  });

  describe('#setApiEndpointUrl()', () => {
    it('should save the configuration', async () => {
      await service.setApiEndpointUrl(ServemeTfApiEndpoint.naServemeTf);
      const c = await servemeTfConfigurationModel.findOne();
      expect(c.apiEndpointUrl).toEqual(ServemeTfApiEndpoint.naServemeTf);
    });
  });

  describe('#getPreferredRegion()', () => {
    it('should reteurn the preferred region', async () => {
      expect(await service.getPreferredRegion()).toBe(undefined);
    });
  });

  describe('#setPreferredRegion()', () => {
    it('should save the configuration', async () => {
      await service.setPreferredRegion('PL');
      const c = await servemeTfConfigurationModel.findOne();
      expect(c.preferredRegion).toEqual('PL');
    });
  });
});
