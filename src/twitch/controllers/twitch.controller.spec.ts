import { Test, TestingModule } from '@nestjs/testing';
import { TwitchController } from './twitch.controller';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { PlayersService } from '@/players/services/players.service';

class TwitchServiceStub {

}

class TwitchAuthServiceStub {

}

class PlayersServiceStub {

}

describe('Twitch Controller', () => {
  let controller: TwitchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitchController],
      providers: [
        { provide: TwitchService, useClass: TwitchServiceStub },
        { provide: TwitchAuthService, useClass: TwitchAuthServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    controller = module.get<TwitchController>(TwitchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
