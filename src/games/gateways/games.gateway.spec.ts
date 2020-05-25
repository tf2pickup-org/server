import { Test, TestingModule } from '@nestjs/testing';
import { GamesGateway } from './games.gateway';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { ObjectId } from 'mongodb';

const mockGame = {
  id: 'FAKE_GAME_ID',
  state: 'launching',
};

class PlayerSubstitutionServiceStub {
  replacePlayer(gameId: ObjectId, replaceeId: ObjectId, replacementId: ObjectId) { return Promise.resolve(mockGame); }
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
      const [ gameId, replacementId, replaceeId ] = [ new ObjectId(), new ObjectId(), new ObjectId() ];
      const ret = await gateway.replacePlayer(
        { request: { user: { id: replacementId.toString() } } },
        { gameId: gameId.toString(), replaceeId: replaceeId.toString() }
      );
      expect(spy).toHaveBeenCalledWith(gameId, replaceeId, replacementId);
      expect(ret).toEqual(mockGame as any);
    });
  });
});
