import { Test, TestingModule } from '@nestjs/testing';
import { LogReceiver } from 'srcds-log-receiver';
import { LogReceiverService } from './log-receiver.service';

class MockLogReceiver {
  socket = {
    close: jest.fn().mockImplementation(cb => cb()),
  };
}

describe('LogReceiverService', () => {
  let service: LogReceiverService;
  let mockLogReceiver: MockLogReceiver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogReceiverService,
        { provide: LogReceiver, useClass: MockLogReceiver },
      ],
    }).compile();

    service = module.get<LogReceiverService>(LogReceiverService);
    mockLogReceiver = module.get(LogReceiver);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should destroy log receiver on module destruction', async () => {
    await service.onModuleDestroy();
    
    expect(mockLogReceiver.socket.close).toHaveBeenCalled();
  });
});
