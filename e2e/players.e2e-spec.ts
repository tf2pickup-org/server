/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { LogReceiver } from 'srcds-log-receiver';
import { MockLogReceiver } from './mock-log-receiver';
import { PlayersService } from '@/players/services/players.service';
import { Player } from '@/players/models/player';
import { SteamProfile } from '@/players/steam-profile';

jest.mock('@/players/services/steam-api.service', () => ({
  SteamApiService: jest.fn().mockImplementation(() => ({
    getTf2InGameHours: () => Promise.resolve(5396), // this is the real number at the time of writing this, btw
  }))
}));

const malySteamProfile: SteamProfile = {
  provider: 'steam',
  id: '76561198074409147',
  displayName: 'mały',
  photos: [
    { value: 'small_avatar_url' },
    { value: 'medium_avatar_url' },
    { value: 'large_avatar_url' },
  ]
};

describe('PlayersController (e2e)', () => {
  let app: INestApplication;
  let mockLogReceiver: MockLogReceiver;
  let maly: Player;

  beforeAll(() => {
    mockLogReceiver = new MockLogReceiver({ address: 'localhost', port: 9871 });
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ AppModule ],
    }).overrideProvider(LogReceiver)
      .useValue(mockLogReceiver)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeAll(async () => {
    const playersService = app.get(PlayersService);
    maly = await playersService.createPlayer(malySteamProfile);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /players', () => {
    return request(app.getHttpServer())
      .get('/players')
      .expect(200)
      .expect([
        {
          id: maly.id,
          steamId: '76561198074409147',
          etf2lProfileId: 112758,
          name: 'maly',
          joinedAt: maly.joinedAt.toISOString(),
          avatar: {
            small: 'small_avatar_url',
            medium: 'medium_avatar_url',
            large: 'large_avatar_url',
          },
          role: 'super-user',
        },
      ]);
  });

  it('GET /players/:id', () => {
    return request(app.getHttpServer())
    .get('/players/' + maly.id)
    .expect(200)
    .expect({
        id: maly.id,
        steamId: '76561198074409147',
        etf2lProfileId: 112758,
        name: 'maly',
        joinedAt: maly.joinedAt.toISOString(),
        avatar: {
          small: 'small_avatar_url',
          medium: 'medium_avatar_url',
          large: 'large_avatar_url',
        },
        role: 'super-user',
      });
  });
});
