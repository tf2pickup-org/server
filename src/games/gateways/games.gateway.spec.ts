import { Test, TestingModule } from '@nestjs/testing';
import { GamesGateway } from './games.gateway';
import { PlayerSubstitutionService } from '../services/player-substitution.service';

const game = {
  id: 'FAKE_GAME_ID',
  state: 'launching',
};

class PlayerSubstitutionServiceStub {
  replacePlayer(gameId: string, replaceeId: string, replacementId: string) { return new Promise(resolve => resolve(game)); }
}

describe('GamesGateway', () => {
  let gateway: GamesGateway;
  let playerSubstitutionService: PlayerSubstitutionServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesGateway,
        { provide: PlayerSubstitutionService, useClass: PlayerSubstitutionServiceStub },
      ],
    }).compile();

    gateway = module.get<GamesGateway>(GamesGateway);
    playerSubstitutionService = module.get(PlayerSubstitutionService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#replacePlayer()', () => {
    it('should replace the player', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'replacePlayer');
      const ret = await gateway.replacePlayer({ request: { user: { id: 'FAKE_REPLACEMENT_ID' } } }, { gameId: 'FAKE_GAME_ID', replaceeId: 'FAKE_REPLACEE_ID' });
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', 'FAKE_REPLACEMENT_ID');
      expect(ret).toEqual(game as any);
    });
  });
});
