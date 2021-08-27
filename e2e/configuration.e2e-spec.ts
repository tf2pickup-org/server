import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
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

  it('GET /configuration/whitelist-id', async () => {
    const response = await request(app.getHttpServer())
      .get('/configuration/whitelist-id')
      .expect(200);
    const body = response.body;
    expect(body).toEqual({
      key: 'whitelist id',
      value: '',
    });
  });

  it('PUT /configuration/whitelist-id', async () => {
    const response = await request(app.getHttpServer())
      .put('/configuration/whitelist-id')
      .auth(adminAuthToken, { type: 'bearer' })
      .send({
        key: 'whitelist id',
        value: 'etf2l_6v6',
      });
    const body = response.body;
    expect(body).toEqual({
      key: 'whitelist id',
      value: 'etf2l_6v6',
    });

    const response2 = await request(app.getHttpServer())
      .get('/configuration/whitelist-id')
      .expect(200);
    const body2 = response2.body;
    expect(body2).toEqual({
      key: 'whitelist id',
      value: 'etf2l_6v6',
    });
  });

  it('GET /configuration/etf2l-account-required', async () => {
    const response = await request(app.getHttpServer())
      .get('/configuration/etf2l-account-required')
      .expect(200);
    const body = response.body;
    expect(body).toEqual({
      key: 'etf2l account required',
      value: false,
    });
  });

  it('PUT /configuration/etf2l-account-required', async () => {
    const response = await request(app.getHttpServer())
      .put('/configuration/etf2l-account-required')
      .auth(adminAuthToken, { type: 'bearer' })
      .send({
        key: 'etf2l account required',
        value: true,
      });
    const body = response.body;
    expect(body).toEqual({
      key: 'etf2l account required',
      value: true,
    });

    const response2 = await request(app.getHttpServer())
      .get('/configuration/etf2l-account-required')
      .expect(200);
    const body2 = response2.body;
    expect(body2).toEqual({
      key: 'etf2l account required',
      value: true,
    });
  });

  it('GET /configuration/minimum-tf2-in-game-hours', async () => {
    const response = await request(app.getHttpServer())
      .get('/configuration/minimum-tf2-in-game-hours')
      .expect(200);
    const body = response.body;
    expect(body).toEqual({
      key: 'minimum tf2 in-game hours',
      value: 0,
    });
  });

  it('PUT /configuration/minimum-tf2-in-game-hours', async () => {
    const response = await request(app.getHttpServer())
      .put('/configuration/minimum-tf2-in-game-hours')
      .auth(adminAuthToken, { type: 'bearer' })
      .send({
        key: 'minimum tf2 in-game hours',
        value: 450,
      });
    const body = response.body;
    expect(body).toEqual({
      key: 'minimum tf2 in-game hours',
      value: 450,
    });

    const response2 = await request(app.getHttpServer())
      .get('/configuration/minimum-tf2-in-game-hours')
      .expect(200);
    const body2 = response2.body;
    expect(body2).toEqual({
      key: 'minimum tf2 in-game hours',
      value: 450,
    });
  });

  it('GET /configuration/default-player-skill', async () => {
    const response = await request(app.getHttpServer())
      .get('/configuration/default-player-skill')
      .expect(200);
    const body = response.body;
    expect(body).toEqual({
      key: 'default player skill',
      value: {
        scout: 1,
        soldier: 1,
        pyro: 1,
        demoman: 1,
        heavy: 1,
        engineer: 1,
        medic: 1,
        sniper: 1,
        spy: 1,
      },
    });
  });

  it('PUT /configuration/default-player-skill', async () => {
    const response = await request(app.getHttpServer())
      .put('/configuration/default-player-skill')
      .auth(adminAuthToken, { type: 'bearer' })
      .send({
        key: 'default player skill',
        value: {
          scout: 2,
          soldier: 3,
          pyro: 4,
          demoman: 5,
          heavy: 6,
          engineer: 7,
          medic: 8,
          sniper: 9,
          spy: 10,
        },
      });
    const body = response.body;
    expect(body).toEqual({
      key: 'default player skill',
      value: {
        scout: 2,
        soldier: 3,
        pyro: 4,
        demoman: 5,
        heavy: 6,
        engineer: 7,
        medic: 8,
        sniper: 9,
        spy: 10,
      },
    });

    const response2 = await request(app.getHttpServer())
      .get('/configuration/default-player-skill')
      .expect(200);
    const body2 = response2.body;
    expect(body2).toEqual({
      key: 'default player skill',
      value: {
        scout: 2,
        soldier: 3,
        pyro: 4,
        demoman: 5,
        heavy: 6,
        engineer: 7,
        medic: 8,
        sniper: 9,
        spy: 10,
      },
    });
  });

  it('GET /configuration/voice-server', async () => {
    const response = await request(app.getHttpServer())
      .get('/configuration/voice-server')
      .expect(200);
    const body = response.body;
    expect(body).toEqual({
      key: 'voice server',
      type: 'none',
    });
  });

  it('PUT /configuration/voice-server', async () => {
    const response = await request(app.getHttpServer())
      .put('/configuration/voice-server')
      .auth(adminAuthToken, { type: 'bearer' })
      .send({
        key: 'voice server',
        type: 'mumble',
        mumble: {
          url: 'melkor.tf',
          port: 64738,
          channelName: 'tf2pickup',
        },
      });
    const body = response.body;
    expect(body).toEqual({
      key: 'voice server',
      type: 'mumble',
      mumble: {
        url: 'melkor.tf',
        port: 64738,
        channelName: 'tf2pickup',
      },
    });

    const response2 = await request(app.getHttpServer())
      .get('/configuration/voice-server')
      .expect(200);
    const body2 = response2.body;
    expect(body2).toEqual({
      key: 'voice server',
      type: 'mumble',
      mumble: {
        url: 'melkor.tf',
        port: 64738,
        channelName: 'tf2pickup',
      },
    });
  });
});
