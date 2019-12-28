import { Test, TestingModule } from '@nestjs/testing';
import { DiscordNotificationsService } from './discord-notifications.service';
import { ConfigService } from '@/config/config.service';
import { PlayersService } from '@/players/services/players.service';

class ConfigServiceStub {

}

class PlayersServiceStub {

}

describe('DiscordNotificationsService', () => {
  let service: DiscordNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordNotificationsService,
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    service = module.get<DiscordNotificationsService>(DiscordNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
