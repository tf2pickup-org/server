import { Tf2Team } from '@/games/models/tf2-team';
import { fixTeamName } from './fix-team-name';

describe('fixTeamName()', () => {
  it('should convert Red to red', () => {
    expect(fixTeamName('Red')).toBe(Tf2Team.red);
  });

  it('should convert Blue to blu', () => {
    expect(fixTeamName('Blue')).toBe(Tf2Team.blu);
  });
});
