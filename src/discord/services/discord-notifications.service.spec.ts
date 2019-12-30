import { Test, TestingModule } from '@nestjs/testing';
import { DiscordNotificationsService } from './discord-notifications.service';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';

class EnvironmentStub {

}

class PlayersServiceStub {

}

describe('DiscordNotificationsService', () => {
  let service: DiscordNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordNotificationsService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    service = module.get<DiscordNotificationsService>(DiscordNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
