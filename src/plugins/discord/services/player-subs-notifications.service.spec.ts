import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubsNotificationsService } from './player-subs-notifications.service';

describe('PlayerSubsNotificationsService', () => {
  let service: PlayerSubsNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerSubsNotificationsService],
    }).compile();

    service = module.get<PlayerSubsNotificationsService>(PlayerSubsNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
