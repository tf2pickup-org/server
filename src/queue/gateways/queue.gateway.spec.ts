import { Test, TestingModule } from '@nestjs/testing';
import { QueueGateway } from './queue.gateway';

describe('QueueGateway', () => {
  let gateway: QueueGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueGateway],
    }).compile();

    gateway = module.get<QueueGateway>(QueueGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
