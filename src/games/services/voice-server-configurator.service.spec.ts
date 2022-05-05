import { Test, TestingModule } from '@nestjs/testing';
import { VoiceServerConfiguratorService } from './voice-server-configurator.service';

describe('VoiceServerConfiguratorService', () => {
  let service: VoiceServerConfiguratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoiceServerConfiguratorService],
    }).compile();

    service = module.get<VoiceServerConfiguratorService>(VoiceServerConfiguratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
