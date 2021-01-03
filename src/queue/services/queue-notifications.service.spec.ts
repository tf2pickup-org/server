import { Test, TestingModule } from '@nestjs/testing';
import { QueueNotificationsService } from './queue-notifications.service';
import { QueueService } from './queue.service';
import { Environment } from '@/environment/environment';
import { DiscordService } from '@/discord/services/discord.service';
import { Events } from '@/events';

jest.mock('@/discord/services/discord.service');

class QueueServiceStub {
  playerCount = 6;
  requiredPlayerCount = 12;
}

const environment = {
  clientUrl: 'FAKE_CLIENT_URL',
  discordQueueNotificationsMentionRole: 'pickups',
};

describe('QueueNotificationsService', () => {
  let service: QueueNotificationsService;
  let queueService: QueueServiceStub;
  let discordService: DiscordService;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueNotificationsService,
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: Environment, useValue: environment },
        DiscordService,
        Events,
      ],
    }).compile();

    service = module.get<QueueNotificationsService>(QueueNotificationsService);
    queueService = module.get(QueueService);
    discordService = module.get(DiscordService);
    events = module.get(Events);

    service.onModuleInit();
  });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a player joins the queue', () => {
    it('should notify after 5 minutes', () => {
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      events.playerJoinsQueue.next({ playerId: 'FAKE_ID' });
      expect(spy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(spy).toHaveBeenCalled();
    });

    it('should notify only once if there are two consecutive player_join events', () => {
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      events.playerJoinsQueue.next({ playerId: 'FAKE_ID' });
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
      events.playerJoinsQueue.next({ playerId: 'FAKE_ID' });
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not notify below specified threshold', () => {
      queueService.playerCount = 5;
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      events.playerJoinsQueue.next({ playerId: 'FAKE_ID' });
      jest.runAllTicks();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not notify on full queue', () => {
      queueService.playerCount = 12;
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      events.playerJoinsQueue.next({ playerId: 'FAKE_ID' });
      jest.runAllTicks();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not notify if the player count drops below the required threshold', () => {
      queueService.playerCount = 6;
      const spy = jest.spyOn(discordService.getPlayersChannel(), 'send');
      events.playerJoinsQueue.next({ playerId: 'FAKE_ID' });
      jest.runAllTicks();
      queueService.playerCount = 5;
      jest.runAllTicks();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
