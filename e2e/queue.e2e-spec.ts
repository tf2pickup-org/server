import { AppModule } from '@/app.module';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { QueueService } from '@/queue/services/queue.service';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

jest.mock('@/players/services/steam-api.service');

describe('Queue (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const playerModel = app.get(getModelToken(Player.name));
    await playerModel.deleteMany({});

    await app.close();
  });

  it('should initialize empty queue', async () => {
    return request(app.getHttpServer())
      .get(`/queue`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.config).toEqual({
          teamCount: 2,
          classes: [
            {
              name: 'scout',
              count: 2,
            },
            {
              name: 'soldier',
              count: 2,
            },
            {
              name: 'demoman',
              count: 1,
            },
            {
              name: 'medic',
              count: 1,
            },
          ],
        });

        expect(body.state).toEqual('waiting');

        expect(body.slots.length).toBe(12);
        expect(body.slots.every((slot) => slot.player === null)).toBe(true);

        expect(body.mapVoteResults.length).toBe(3);
        expect(
          body.mapVoteResults.every((result) => result.voteCount === 0),
        ).toBe(true);

        expect(body.substituteRequests).toEqual([]);
        expect(body.friendships).toEqual([]);
      });
  });

  describe('when 12 players join the queue', () => {
    let players: Player[];

    beforeAll(async () => {
      players = [];
      const playersService = app.get(PlayersService);
      const fakeAccounts = (await import('./steam-profiles')).fakeAccounts;
      for (let i = 0; i < 12; ++i) {
        players.push(await playersService.createPlayer(fakeAccounts[i]));
      }

      const queueService = app.get(QueueService);
      for (let i = 0; i < 12; ++i) {
        await queueService.join(i, `${players[i].id}`);
      }
    });

    it('should change state to ready', async () => {
      return request(app.getHttpServer())
        .get('/queue')
        .expect(200)
        .then((response) => {
          const body = response.body;
          expect(body.state).toEqual('ready');
          expect(body.slots.every((slot) => slot.player !== null)).toBe(true);
          expect(body.slots.every((slot) => slot.ready === false)).toBe(true);
        });
    });
  });
});
