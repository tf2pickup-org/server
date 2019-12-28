import { Test, TestingModule } from '@nestjs/testing';
import { QueueNotificationsService } from './queue-notifications.service';
import { QueueService } from './queue.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { Subject } from 'rxjs';

class QueueServiceStub {
  playerCount = 6;
  requiredPlayerCount = 12;
  playerJoin = new Subject<string>();
}

class DiscordNotificationsServiceStub {
  public notifyQueue(currentPlayerCount: number, targetPlayerCount: number) { return null; }
}

describe('QueueNotificationsService', () => {
  let service: QueueNotificationsService;
  let queueService: QueueServiceStub;
  let discordNotificationsService: DiscordNotificationsServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueNotificationsService,
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: DiscordNotificationsService, useClass: DiscordNotificationsServiceStub },
      ],
    }).compile();

    service = module.get<QueueNotificationsService>(QueueNotificationsService);
    queueService = module.get(QueueService);
    discordNotificationsService = module.get(DiscordNotificationsService);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a player joins the queue', () => {
    beforeAll(() => jasmine.clock().install());
    afterAll(() => jasmine.clock().uninstall());

    it('should notify after 5 minutes', () => {
      const spy = spyOn(discordNotificationsService, 'notifyQueue');
      queueService.playerJoin.next('FAKE_ID');
      expect(spy).not.toHaveBeenCalled();
      jasmine.clock().tick(5 * 60 * 1000 + 1);
      expect(spy).toHaveBeenCalledWith(6, 12);
    });

    it('should notify only once if there are two consecutive player_join events', () => {
      const spy = spyOn(discordNotificationsService, 'notifyQueue');
      queueService.playerJoin.next('FAKE_ID');
      jasmine.clock().tick(4 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
      queueService.playerJoin.next('FAKE_ID');
      jasmine.clock().tick(4 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
      jasmine.clock().tick(60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not notify below specified threshold', () => {
      queueService.playerCount = 5;
      const spy = spyOn(discordNotificationsService, 'notifyQueue');
      queueService.playerJoin.next('FAKE_ID');
      jasmine.clock().tick(5 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not notify on full queue', () => {
      queueService.playerCount = 12;
      const spy = spyOn(discordNotificationsService, 'notifyQueue');
      queueService.playerJoin.next('FAKE_ID');
      jasmine.clock().tick(5 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not notify if the player count drops below the required threshold', () => {
      queueService.playerCount = 6;
      const spy = spyOn(discordNotificationsService, 'notifyQueue');
      queueService.playerJoin.next('FAKE_ID');
      jasmine.clock().tick(4 * 60 * 1000);
      queueService.playerCount = 5;
      jasmine.clock().tick(5 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
