import { PopulatePlayersInterceptor } from './populate-players.interceptor';
import { PlayerPopulatorService } from '../services/player-populator.service';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Player } from '@/players/models/player';

jest.mock('../services/player-populator.service');

describe('PopulatePlayersInterceptor', () => {
  let interceptor: PopulatePlayersInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerPopulatorService],
    }).compile();

    const playerPopulatorService = module.get(
      PlayerPopulatorService,
    ) as jest.Mocked<PlayerPopulatorService>;
    interceptor = new PopulatePlayersInterceptor(playerPopulatorService);

    playerPopulatorService.populatePlayer.mockResolvedValue({
      id: 2,
      gameClass: Tf2ClassName.soldier,
      ready: false,
      playerId: 'FAKE_PLAYER_ID',
      player: { id: 'FAKE_PLAYER_ID' } as Player,
    });
    playerPopulatorService.populatePlayers.mockResolvedValue([
      {
        id: 2,
        gameClass: Tf2ClassName.soldier,
        ready: false,
        playerId: 'FAKE_PLAYER_ID',
        player: { id: 'FAKE_PLAYER_ID' } as Player,
      },
    ]);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should resolve for single slot', async () =>
    new Promise<void>((resolve) => {
      const next = {
        handle: () =>
          of({
            id: 2,
            gameClass: Tf2ClassName.soldier,
            ready: false,
            playerId: 'FAKE_PLAYER_ID',
          }),
      };

      interceptor.intercept(null, next).subscribe((data) => {
        expect(data).toEqual({
          id: 2,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: 'FAKE_PLAYER_ID',
          player: { id: 'FAKE_PLAYER_ID' },
        });
        resolve();
      });
    }));

  it('should resolve for slots array', async () =>
    new Promise<void>((resolve) => {
      const next = {
        handle: () =>
          of([
            {
              id: 2,
              gameClass: Tf2ClassName.soldier,
              ready: false,
              playerId: 'FAKE_PLAYER_ID',
            },
          ]),
      };

      interceptor.intercept(null, next).subscribe((data) => {
        expect(data).toEqual([
          {
            id: 2,
            gameClass: Tf2ClassName.soldier,
            ready: false,
            playerId: 'FAKE_PLAYER_ID',
            player: { id: 'FAKE_PLAYER_ID' },
          },
        ]);
        resolve();
      });
    }));
});
