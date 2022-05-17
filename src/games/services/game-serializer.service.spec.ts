import { Test, TestingModule } from '@nestjs/testing';
import { GameSerializerService } from './game-serializer.service';

describe('GameSerializerService', () => {
  let service: GameSerializerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameSerializerService],
    }).compile();

    service = module.get<GameSerializerService>(GameSerializerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
