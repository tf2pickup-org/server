import { Test, TestingModule } from '@nestjs/testing';
import { QueueGateway } from './queue.gateway';
import { QueueService } from '../services/queue.service';

class QueueServiceStub {

}

describe('QueueGateway', () => {
  let gateway: QueueGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueGateway,
        { provide: QueueService, useClass: QueueServiceStub },
      ],
    }).compile();

    gateway = module.get<QueueGateway>(QueueGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
