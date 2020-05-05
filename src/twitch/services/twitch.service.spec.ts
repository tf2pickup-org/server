import { Test, TestingModule } from '@nestjs/testing';
import { TwitchService } from './twitch.service';
import { PlayersService } from '@/players/services/players.service';
import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '@/environment/environment';
import { of } from 'rxjs';

class PlayersServiceStub {

}

class HttpServiceStub {
  get(url: string, options: any) { return of(); }
}

class ConfigServiceStub {
  get(key: string) { return ''; }
}

const environment = {
  apiUrl: 'FAKE_API_URL',
  twitchClientId: 'FAKE_TWITCH_CLIENT_ID',
};

describe('TwitchService', () => {
  let service: TwitchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: HttpService, useClass: HttpServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    service = module.get<TwitchService>(TwitchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#fetchUserProfile()', () => {

  });
});
