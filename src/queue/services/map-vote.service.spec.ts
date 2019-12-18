import { Test, TestingModule } from '@nestjs/testing';
import { MapVoteService } from './map-vote.service';

describe('MapVoteService', () => {
  let service: MapVoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapVoteService],
    }).compile();

    service = module.get<MapVoteService>(MapVoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
