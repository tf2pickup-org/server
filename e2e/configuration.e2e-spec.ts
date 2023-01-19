import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { configureApplication } from '@/configure-application';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { players } from './test-data';

describe('Configuration (e2e)', () => {
  let app: INestApplication;
  let adminAuthToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    const playersService = app.get(PlayersService);
    const player = await playersService.findBySteamId(players[0]);
    const authService = app.get(AuthService);
    adminAuthToken = await authService.generateJwtToken(
      JwtTokenPurpose.auth,
      player.id,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('whitelist id', async () => {
    {
      const response = await request(app.getHttpServer())
        .get('/configuration?keys=games.whitelist_id')
        .auth(adminAuthToken, { type: 'bearer' })
        .expect(200);
      const body = response.body;
      expect(body).toEqual([
        expect.objectContaining({
          key: 'games.whitelist_id',
        }),
      ]);
      expect(body[0].value).toBeUndefined();
    }

    {
      const response = await request(app.getHttpServer())
        .put('/configuration')
        .auth(adminAuthToken, { type: 'bearer' })
        .send({
          key: 'games.whitelist_id',
          value: 'etf2l_6v6',
        });
      const body = response.body;
      expect(body).toEqual([
        expect.objectContaining({
          key: 'games.whitelist_id',
          value: 'etf2l_6v6',
        }),
      ]);
    }
  });

  // eslint-disable-next-line jest/expect-expect
  it('not found', async () => {
    await request(app.getHttpServer())
      .get('/configuration?keys=not.existent')
      .auth(adminAuthToken, { type: 'bearer' })
      .expect(404);
  });

  // eslint-disable-next-line jest/expect-expect
  it('malformed', async () => {
    await request(app.getHttpServer())
      .put('/configuration')
      .auth(adminAuthToken, { type: 'bearer' })
      .send([
        {
          key: 'games.whitelist_id',
          value: 123456,
        },
      ])
      .expect(400);
  });

  // eslint-disable-next-line jest/expect-expect
  it('unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/configuration?keys=games.whitelist_id')
      .expect(401);

    await request(app.getHttpServer())
      .put('/configuration')
      .send({
        key: 'games.whitelist_id',
        value: 'etf2l_6v6',
      })
      .expect(401);
  });
});
