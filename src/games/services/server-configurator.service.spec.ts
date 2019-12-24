import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';
import { ConfigService } from '@/config/config.service';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';

class ConfigServiceStub {

}

class PlayersServiceStub {

}

class QueueConfigServiceStub {

}

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerConfiguratorService,
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
      ],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
