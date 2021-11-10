import { SteamIdPipe } from './steam-id.pipe';
import { BadRequestException } from '@nestjs/common';

describe('SteamIdPipe', () => {
  it('should pass valid steam id 64', () => {
    const id = '76561198074409147';

    expect(new SteamIdPipe().transform(id)).toEqual(id);
  });

  it('should pass valid steam id 0', () => {
    const id = 'STEAM_0:1:57071709';

    expect(new SteamIdPipe().transform(id)).toEqual(id);
  });

  it('should pass valid steam id 3', () => {
    const id = '[U:1:114143419]';

    expect(new SteamIdPipe().transform(id)).toEqual(id);
  });

  it('should deny invalid steam id', () => {
    expect(() => new SteamIdPipe().transform('1234abc')).toThrow(
      BadRequestException,
    );
  });
});
