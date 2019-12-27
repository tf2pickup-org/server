import { Test, TestingModule } from '@nestjs/testing';
import { DiscordNotificationsService } from './discord-notifications.service';

describe('DiscordNotificationsService', () => {
  let service: DiscordNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordNotificationsService],
    }).compile();

    service = module.get<DiscordNotificationsService>(DiscordNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
