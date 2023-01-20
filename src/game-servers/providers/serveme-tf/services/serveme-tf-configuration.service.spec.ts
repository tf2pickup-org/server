import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';

jest.mock('@/configuration/services/configuration.service');

describe('ServemeTfConfigurationService', () => {
  let service: ServemeTfConfigurationService;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServemeTfConfigurationService, ConfigurationService],
    }).compile();

    service = module.get<ServemeTfConfigurationService>(
      ServemeTfConfigurationService,
    );
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a default configuration', () => {
    expect(configurationService.register).toHaveBeenCalledTimes(1);
  });

  describe('#getPreferredRegion()', () => {
    beforeEach(() => {
      configurationService.get.mockImplementation((key) =>
        Promise.resolve(
          {
            'serveme_tf.preferred_region': 'de',
          }[key],
        ),
      );
    });

    it('should return the preferred region', async () => {
      expect(await service.getPreferredRegion()).toBe('de');
    });
  });
});
