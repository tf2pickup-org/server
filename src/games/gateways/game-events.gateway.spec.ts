import { Test, TestingModule } from '@nestjs/testing';
import { GameEventsGateway } from './game-events.gateway';

describe('GameEventsGateway', () => {
  let gateway: GameEventsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameEventsGateway],
    }).compile();

    gateway = module.get<GameEventsGateway>(GameEventsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
