import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationItem } from '../models/configuration-item';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationController } from './configuration.controller';

jest.mock('../services/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => {
    const mockConfiguration = new Map();
    return {
      set: jest.fn().mockImplementation((entry: ConfigurationItem) => {
        mockConfiguration.set(entry.key, entry);
        return Promise.resolve();
      }),
    };
  }),
}));

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(() => {
    (
      ConfigurationService as jest.MockedClass<typeof ConfigurationService>
    ).mockClear();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [ConfigurationService],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    configurationService = module.get(ConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
