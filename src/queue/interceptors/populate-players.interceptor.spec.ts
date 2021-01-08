import { PopulatePlayersInterceptor } from './populate-players.interceptor';
import { PlayerPopulatorService } from '../services/player-populator.service';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../services/player-populator.service');

describe('PopulatePlayersInterceptor', () => {
  let interceptor: PopulatePlayersInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerPopulatorService,
      ],
    }).compile();

    const playerPopulatorService = module.get(PlayerPopulatorService);
    interceptor = new PopulatePlayersInterceptor(playerPopulatorService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });
});
