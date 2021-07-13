jest.mock('@configs/discord', () => ({
  iconUrlPath: '',
  promptPlayerThresholdRatio: 0.1,
}));
import { promptPlayerThresholdRatio } from '@configs/discord';

import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Player, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { QueueService } from '@/queue/services/queue.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { Message } from 'discord.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DiscordService } from './discord.service';
import { QueuePromptsService } from './queue-prompts.service';
import { MongooseModule } from '@nestjs/mongoose';

jest.mock('./discord.service');
jest.mock('@/queue/services/queue.service');
jest.mock('@/players/services/players.service');
jest.mock('@/queue/services/queue-config.service');

const environment = {
  clientUrl: 'https://tf2pickup.pl',
};

describe('QueuePromptsService', () => {
  let service: QueuePromptsService;
  let mongod: MongoMemoryServer;
  let events: Events;
  let queueService: jest.Mocked<QueueService>;
  let playersService: PlayersService;
  let discordService: DiscordService;
  let players: Player[];

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    (QueueService as jest.MockedClass<typeof QueueService>).mockImplementation(
      () =>
        ({
          slots: [],
          requiredPlayerCount: 12,
        } as any),
    );

    (
      QueueConfigService as jest.MockedClass<typeof QueueConfigService>
    ).mockImplementation(
      () =>
        ({
          queueConfig: {
            teamCount: 2,
            classes: [
              { name: Tf2ClassName.scout, count: 2 },
              { name: Tf2ClassName.soldier, count: 2 },
              { name: Tf2ClassName.demoman, count: 1 },
              { name: Tf2ClassName.medic, count: 1 },
            ],
            whitelistId: '12345',
          },
        } as any),
    );
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
      ],
      providers: [
        QueuePromptsService,
        Events,
        DiscordService,
        QueueService,
        PlayersService,
        QueueConfigService,
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    service = module.get<QueuePromptsService>(QueuePromptsService);
    events = module.get(Events);
    queueService = module.get(QueueService);
    playersService = module.get(PlayersService);
    discordService = module.get(DiscordService);
  });

  beforeEach(async () => {
    // @ts-ignore
    queueService.playerCount = 3;

    players = [
      // @ts-expect-error
      await playersService._createOne(),
      // @ts-expect-error
      await playersService._createOne(),
      // @ts-expect-error
      await playersService._createOne(),
    ];

    queueService.slots = [
      {
        id: 0,
        gameClass: Tf2ClassName.scout,
        playerId: players[0].id,
        ready: false,
      },
      { id: 1, gameClass: Tf2ClassName.scout, playerId: null, ready: false },
      { id: 2, gameClass: Tf2ClassName.scout, playerId: null, ready: false },
      { id: 3, gameClass: Tf2ClassName.scout, playerId: null, ready: false },
      { id: 4, gameClass: Tf2ClassName.soldier, playerId: null, ready: false },
      {
        id: 5,
        gameClass: Tf2ClassName.soldier,
        playerId: players[1].id,
        ready: false,
      },
      { id: 6, gameClass: Tf2ClassName.soldier, playerId: null, ready: false },
      { id: 7, gameClass: Tf2ClassName.soldier, playerId: null, ready: false },
      { id: 8, gameClass: Tf2ClassName.demoman, playerId: null, ready: false },
      { id: 9, gameClass: Tf2ClassName.demoman, playerId: null, ready: false },
      {
        id: 10,
        gameClass: Tf2ClassName.medic,
        playerId: players[2].id,
        ready: false,
      },
      { id: 11, gameClass: Tf2ClassName.medic, playerId: null, ready: false },
    ];
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when slots change', () => {
    beforeEach(
      async () =>
        new Promise<void>((resolve) => {
          events.queueSlotsChange.next({ slots: queueService.slots });
          setTimeout(resolve, 3500);
        }),
    );

    it('should send a new prompt', () => {
      const channel = discordService.getPlayersChannel();
      expect(channel.send).toHaveBeenCalledWith({
        embed: expect.objectContaining({
          title: expect.stringMatching(/3\/12 players in the queue!/),
          description: expect.stringMatching(
            /\[tf2pickup.pl\]\(https:\/\/tf2pickup.pl\)/,
          ),
          fields: [
            {
              name: '<emoji:tf2scout> scout (1/4)',
              value: '\u2000\u25CF\u2000fake_player_1',
              inline: true,
            },
            {
              name: '<emoji:tf2soldier> soldier (1/4)',
              value: '\u2000\u25CF\u2000fake_player_2',
              inline: true,
            },
            {
              name: '<emoji:tf2demoman> demoman (0/2)',
              value: '\u200B',
              inline: true,
            },
            {
              name: '<emoji:tf2medic> medic (1/2)',
              value: '\u2000\u25CF\u2000fake_player_3',
              inline: true,
            },
          ],
        }),
      });
    });

    describe('when slots change again', () => {
      beforeEach(
        async () =>
          new Promise<void>((resolve) => {
            queueService.slots = [
              {
                id: 0,
                gameClass: Tf2ClassName.scout,
                playerId: players[0].id,
                ready: false,
              },
              {
                id: 1,
                gameClass: Tf2ClassName.scout,
                playerId: null,
                ready: false,
              },
              {
                id: 2,
                gameClass: Tf2ClassName.scout,
                playerId: null,
                ready: false,
              },
              {
                id: 3,
                gameClass: Tf2ClassName.scout,
                playerId: null,
                ready: false,
              },
              {
                id: 4,
                gameClass: Tf2ClassName.soldier,
                playerId: null,
                ready: false,
              },
              {
                id: 5,
                gameClass: Tf2ClassName.soldier,
                playerId: players[1].id,
                ready: false,
              },
              {
                id: 6,
                gameClass: Tf2ClassName.soldier,
                playerId: players[2].id,
                ready: false,
              },
              {
                id: 7,
                gameClass: Tf2ClassName.soldier,
                playerId: null,
                ready: false,
              },
              {
                id: 8,
                gameClass: Tf2ClassName.demoman,
                playerId: null,
                ready: false,
              },
              {
                id: 9,
                gameClass: Tf2ClassName.demoman,
                playerId: null,
                ready: false,
              },
              {
                id: 10,
                gameClass: Tf2ClassName.medic,
                playerId: null,
                ready: false,
              },
              {
                id: 11,
                gameClass: Tf2ClassName.medic,
                playerId: null,
                ready: false,
              },
            ];
            events.queueSlotsChange.next({ slots: queueService.slots });
            setTimeout(resolve, 3500);
          }),
      );

      it('should edit the previous embed', () => {
        expect((discordService as any)._lastMessage.edit).toHaveBeenCalledWith({
          embed: expect.objectContaining({
            title: expect.stringMatching(/3\/12 players in the queue!/),
            description: expect.stringMatching(
              /\[tf2pickup.pl\]\(https:\/\/tf2pickup.pl\)/,
            ),
            fields: [
              {
                name: '<emoji:tf2scout> scout (1/4)',
                value: '\u2000\u25CF\u2000fake_player_1',
                inline: true,
              },
              {
                name: '<emoji:tf2soldier> soldier (2/4)',
                value:
                  '\u2000\u25CF\u2000fake_player_2\n\u2000\u25CF\u2000fake_player_3',
                inline: true,
              },
              {
                name: '<emoji:tf2demoman> demoman (0/2)',
                value: '\u200B',
                inline: true,
              },
              {
                name: '<emoji:tf2medic> medic (0/2)',
                value: '\u200B',
                inline: true,
              },
            ],
          }),
        });
      });
    });

    describe('#ensurePromptIsVisible()', () => {
      let message: Message;

      beforeEach(() => {
        message = (discordService as any)._lastMessage;
        discordService.getPlayersChannel().send('foo');
      });

      it('should delete the message', async () => {
        service.ensurePromptIsVisible();
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(message.delete).toHaveBeenCalled();
      });
    });
  });
});
