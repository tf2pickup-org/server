import { Test, TestingModule } from '@nestjs/testing';
import { MumbleBotService } from './mumble-bot.service';

describe('MumbleBotService', () => {
  let service: MumbleBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MumbleBotService],
    }).compile();

    service = module.get<MumbleBotService>(MumbleBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
