import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSerializerService } from './player-serializer.service';

describe('PlayerSerializerService', () => {
  let service: PlayerSerializerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerSerializerService],
    }).compile();

    service = module.get<PlayerSerializerService>(PlayerSerializerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
