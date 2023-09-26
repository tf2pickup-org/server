import { Test, TestingModule } from '@nestjs/testing';
import { AdminNotificationsService } from './admin-notifications.service';

describe('AdminNotificationsService', () => {
  let service: AdminNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminNotificationsService],
    }).compile();

    service = module.get<AdminNotificationsService>(AdminNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
