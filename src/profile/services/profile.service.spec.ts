import { Events } from '@/events/events';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';

jest.mock('@/players/services/online-players.service');
jest.mock('@/players/services/linked-profiles.service');

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        Events,
        OnlinePlayersService,
        LinkedProfilesService,
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
