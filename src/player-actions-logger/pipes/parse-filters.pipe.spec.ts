import { PlayersService } from '@/players/services/players.service';
import { ParseFiltersPipe } from './parse-filters.pipe';

jest.mock('@/players/services/players.service', () => ({
  PlayersService: jest.fn().mockImplementation(() => ({
    find: (query) => Promise.resolve([{ _id: 'FAKE_PLAYER_ID' }]),
  })),
}));

describe('ParseFiltersPipe', () => {
  let playersService: jest.Mocked<PlayersService>;
  let pipe: ParseFiltersPipe;

  beforeEach(() => {
    // @ts-ignore
    playersService = new PlayersService();
    pipe = new ParseFiltersPipe(playersService);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should handle no input', async () => {
    expect(await pipe.transform({})).toEqual({});
  });

  it('should map players query', async () => {
    const query = await pipe.transform({
      'player.name': 'FAKE_PLAYER',
      ipAddress: '127.0.0.1',
    });
    expect(query).toEqual({
      player: ['FAKE_PLAYER_ID'],
      ipAddress: '127.0.0.1',
    });
  });
});
