jest.mock('@configs/discord', () => ({
  iconUrlPath: '',
  promptPlayerThresholdRatio: 0.1,
}));
import { promptPlayerThresholdRatio } from '@configs/discord';

import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Player, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { QueueService } from '@/queue/services/queue.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { Message } from 'discord.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DiscordService } from './discord.service';
import { QueuePromptsService } from './queue-prompts.service';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CacheModule } from '@nestjs/common';

jest.mock('./discord.service');
jest.mock('@/queue/services/queue.service');
jest.mock('@/players/services/players.service');

const environment = {
  clientUrl: 'https://tf2pickup.pl',
};

describe('QueuePromptsService', () => {
  let service: QueuePromptsService;
  let mongod: MongoMemoryServer;
  let events: Events;
  let queueService: jest.Mocked<QueueService>;
  let playersService: PlayersService;
  let discordService: jest.Mocked<DiscordService>;
  let players: Player[];
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    (QueueService as jest.MockedClass<typeof QueueService>).mockImplementation(
      () =>
        ({
          slots: [],
          requiredPlayerCount: 12,
        } as any),
    );
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
        CacheModule.register(),
      ],
      providers: [
        QueuePromptsService,
        Events,
        DiscordService,
        QueueService,
        PlayersService,
        {
          provide: 'QUEUE_CONFIG',
          useValue: {
            teamCount: 2,
            classes: [
              { name: Tf2ClassName.scout, count: 2 },
              { name: Tf2ClassName.soldier, count: 2 },
              { name: Tf2ClassName.demoman, count: 1 },
              { name: Tf2ClassName.medic, count: 1 },
            ],
          },
        },
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    service = module.get<QueuePromptsService>(QueuePromptsService);
    events = module.get(Events);
    queueService = module.get(QueueService);
    playersService = module.get(PlayersService);
    discordService = module.get(DiscordService);
    connection = module.get(getConnectionToken());
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
        playerId: players[0]._id,
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
        playerId: players[1]._id,
        ready: false,
      },
      {
        id: 6,
        gameClass: Tf2ClassName.soldier,
        playerId: null,
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
        playerId: players[2]._id,
        ready: false,
      },
      {
        id: 11,
        gameClass: Tf2ClassName.medic,
        playerId: null,
        ready: false,
      },
    ];
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when slots change', () => {
    beforeEach(
      () =>
        new Promise<void>((resolve) => {
          events.queueSlotsChange.next({ slots: queueService.slots });
          setTimeout(resolve, 3500);
        }),
    );

    it('should send a new prompt', () => {
      const channel = discordService.getPlayersChannel();
      expect(channel?.send).toHaveBeenCalledTimes(1);
    });

    describe('when slots change again', () => {
      beforeEach(
        () =>
          new Promise<void>((resolve) => {
            queueService.slots = [
              {
                id: 0,
                gameClass: Tf2ClassName.scout,
                playerId: players[0]._id,
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
                playerId: players[1]._id,
                ready: false,
              },
              {
                id: 6,
                gameClass: Tf2ClassName.soldier,
                playerId: players[2]._id,
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
        expect((discordService as any)._lastMessage.edit).toHaveBeenCalledTimes(
          1,
        );
      });
    });

    describe('#ensurePromptIsVisible()', () => {
      let message: Message;

      beforeEach(() => {
        message = (discordService as any)._lastMessage;
        discordService.getPlayersChannel()?.send('foo');
      });

      it('should delete the message', async () => {
        service.ensurePromptIsVisible();
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(message.delete).toHaveBeenCalled();
      });
    });
  });
});
