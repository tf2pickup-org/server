import { pickTeams, PlayerSlot, TeamOverrides } from './pick-teams';

describe('pickTeams', () => {
  describe('for 2v2', () => {
    const players: PlayerSlot[] = [
      { player: 'a', gameClass: 'soldier', skill: 1 },
      { player: 'b', gameClass: 'soldier', skill: 2 },
      { player: 'c', gameClass: 'soldier', skill: 3 },
      { player: 'd', gameClass: 'soldier', skill: 4 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(players)).toEqual([
        { player: 'a', gameClass: 'soldier', skill: 1, team: 'blu' },
        { player: 'd', gameClass: 'soldier', skill: 4, team: 'blu' },
        { player: 'b', gameClass: 'soldier', skill: 2, team: 'red' },
        { player: 'c', gameClass: 'soldier', skill: 3, team: 'red' },
      ]);
    });

    describe('with friends', () => {
      describe('having all the friends valid', () => {
        const overrides: TeamOverrides = {
          friends: [
            [ 'a', 'c' ], // 'a' and 'c' will be in the same team
          ],
        };

        it('should pick teams', () => {
          expect(pickTeams(players, overrides)).toEqual([
            { player: 'a', gameClass: 'soldier', skill: 1, team: 'blu' },
            { player: 'c', gameClass: 'soldier', skill: 3, team: 'blu' },
            { player: 'b', gameClass: 'soldier', skill: 2, team: 'red' },
            { player: 'd', gameClass: 'soldier', skill: 4, team: 'red' },
          ]);
        });
      });

      describe('missing one friend', () => {
        const overrides: TeamOverrides = {
          friends: [
            [ 'a', 'e' ],
          ],
        };

        it('should pick teams', () => {
          expect(pickTeams(players, overrides)).toEqual([
            { player: 'a', gameClass: 'soldier', skill: 1, team: 'blu' },
            { player: 'd', gameClass: 'soldier', skill: 4, team: 'blu' },
            { player: 'b', gameClass: 'soldier', skill: 2, team: 'red' },
            { player: 'c', gameClass: 'soldier', skill: 3, team: 'red' },
          ]);
        });
      });
    });
  });

  describe('for 6v6', () => {
    const players: PlayerSlot[] = [
      { player: 'a', gameClass: 'scout', skill: 3 },
      { player: 'b', gameClass: 'scout', skill: 2 },
      { player: 'c', gameClass: 'scout', skill: 2 },
      { player: 'd', gameClass: 'scout', skill: 2 },
      { player: 'e', gameClass: 'soldier', skill: 4 },
      { player: 'f', gameClass: 'soldier', skill: 4 },
      { player: 'g', gameClass: 'soldier', skill: 5 },
      { player: 'h', gameClass: 'soldier', skill: 4 },
      { player: 'i', gameClass: 'demoman', skill: 1 },
      { player: 'j', gameClass: 'demoman', skill: 3 },
      { player: 'k', gameClass: 'medic', skill: 2 },
      { player: 'l', gameClass: 'medic', skill: 4 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(players)).toEqual([
        { player: 'a', gameClass: 'scout', skill: 3, team: 'blu' },
        { player: 'b', gameClass: 'scout', skill: 2, team: 'blu' },
        { player: 'e', gameClass: 'soldier', skill: 4, team: 'blu' },
        { player: 'f', gameClass: 'soldier', skill: 4, team: 'blu' },
        { player: 'i', gameClass: 'demoman', skill: 1, team: 'blu' },
        { player: 'l', gameClass: 'medic', skill: 4, team: 'blu' },
        { player: 'c', gameClass: 'scout', skill: 2, team: 'red' },
        { player: 'd', gameClass: 'scout', skill: 2, team: 'red' },
        { player: 'g', gameClass: 'soldier', skill: 5, team: 'red' },
        { player: 'h', gameClass: 'soldier', skill: 4, team: 'red' },
        { player: 'j', gameClass: 'demoman', skill: 3, team: 'red' },
        { player: 'k', gameClass: 'medic', skill: 2, team: 'red' },
      ]);
    });

    describe('with friends', () => {
      const overrides: TeamOverrides = {
        friends: [
          [ 'k', 'i' ],
          [ 'l', 'g' ],
        ],
      };

      it('should pick teams', () => {
        expect(pickTeams(players, overrides)).toEqual([
          { player: 'a', gameClass: 'scout', skill: 3, team: 'blu' },
          { player: 'b', gameClass: 'scout', skill: 2, team: 'blu' },
          { player: 'e', gameClass: 'soldier', skill: 4, team: 'blu' },
          { player: 'f', gameClass: 'soldier', skill: 4, team: 'blu' },
          { player: 'i', gameClass: 'demoman', skill: 1, team: 'blu' },
          { player: 'k', gameClass: 'medic', skill: 2, team: 'blu' },

          { player: 'c', gameClass: 'scout', skill: 2, team: 'red' },
          { player: 'd', gameClass: 'scout', skill: 2, team: 'red' },
          { player: 'g', gameClass: 'soldier', skill: 5, team: 'red' },
          { player: 'h', gameClass: 'soldier', skill: 4, team: 'red' },
          { player: 'j', gameClass: 'demoman', skill: 3, team: 'red' },
          { player: 'l', gameClass: 'medic', skill: 4, team: 'red' },
        ]);
      });
    });
  });

  describe('for 9v9', () => {
    const players: PlayerSlot[] = [
      { player: 'a', gameClass: 'scout', skill: 1 },
      { player: 'b', gameClass: 'scout', skill: 9 },
      { player: 'c', gameClass: 'soldier', skill: 2 },
      { player: 'd', gameClass: 'soldier', skill: 8 },
      { player: 'e', gameClass: 'pyro', skill: 3 },
      { player: 'f', gameClass: 'pyro', skill: 7 },
      { player: 'g', gameClass: 'demoman', skill: 4 },
      { player: 'h', gameClass: 'demoman', skill: 6 },
      { player: 'i', gameClass: 'heavy', skill: 5 },
      { player: 'j', gameClass: 'heavy', skill: 5 },
      { player: 'k', gameClass: 'engineer', skill: 6 },
      { player: 'l', gameClass: 'engineer', skill: 4 },
      { player: 'm', gameClass: 'medic', skill: 7 },
      { player: 'n', gameClass: 'medic', skill: 3 },
      { player: 'o', gameClass: 'sniper', skill: 8 },
      { player: 'p', gameClass: 'sniper', skill: 2 },
      { player: 'q', gameClass: 'spy', skill: 9 },
      { player: 'r', gameClass: 'spy', skill: 1 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(players)).toEqual([
        { player: 'a', gameClass: 'scout', skill: 1, team: 'blu' },
        { player: 'c', gameClass: 'soldier', skill: 2, team: 'blu' },
        { player: 'e', gameClass: 'pyro', skill: 3, team: 'blu' },
        { player: 'g', gameClass: 'demoman', skill: 4, team: 'blu' },
        { player: 'i', gameClass: 'heavy', skill: 5, team: 'blu' },
        { player: 'k', gameClass: 'engineer', skill: 6, team: 'blu' },
        { player: 'm', gameClass: 'medic', skill: 7, team: 'blu' },
        { player: 'o', gameClass: 'sniper', skill: 8, team: 'blu' },
        { player: 'q', gameClass: 'spy', skill: 9, team: 'blu' },
        { player: 'b', gameClass: 'scout', skill: 9, team: 'red' },
        { player: 'd', gameClass: 'soldier', skill: 8, team: 'red' },
        { player: 'f', gameClass: 'pyro', skill: 7, team: 'red' },
        { player: 'h', gameClass: 'demoman', skill: 6, team: 'red' },
        { player: 'j', gameClass: 'heavy', skill: 5, team: 'red' },
        { player: 'l', gameClass: 'engineer', skill: 4, team: 'red' },
        { player: 'n', gameClass: 'medic', skill: 3, team: 'red' },
        { player: 'p', gameClass: 'sniper', skill: 2, team: 'red' },
        { player: 'r', gameClass: 'spy', skill: 1, team: 'red' },
      ]);
    });
  });

  it('should throw an error if trying to make teams of 3 players the same class', () => {
    const players: PlayerSlot[] = [
      { player: 'a', gameClass: 'soldier', skill: 1 },
      { player: 'b', gameClass: 'soldier', skill: 2 },
      { player: 'c', gameClass: 'soldier', skill: 3 },
      { player: 'd', gameClass: 'soldier', skill: 4 },
      { player: 'e', gameClass: 'soldier', skill: 5 },
      { player: 'f', gameClass: 'soldier', skill: 6 },
    ];

    expect(() => pickTeams(players)).toThrow();
  });

  it('should throw an error if player count is not even', () => {
    const players: PlayerSlot[] = [
      { player: 'a', gameClass: 'soldier', skill: 1 },
      { player: 'b', gameClass: 'soldier', skill: 2 },
      { player: 'c', gameClass: 'soldier', skill: 3 },
    ];

    expect(() => pickTeams(players)).toThrow();
  });
});
