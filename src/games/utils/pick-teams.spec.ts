import { pickTeams, PlayerSlot, TeamOverrides } from './pick-teams';
import { shuffle } from 'lodash';

describe('pickTeams', () => {
  describe('for 2v2', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: 'soldier', skill: 1 },
      { playerId: 'b', gameClass: 'soldier', skill: 2 },
      { playerId: 'c', gameClass: 'soldier', skill: 3 },
      { playerId: 'd', gameClass: 'soldier', skill: 4 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(playerIds)).toEqual([
        { playerId: 'a', gameClass: 'soldier', skill: 1, team: 'blu' },
        { playerId: 'd', gameClass: 'soldier', skill: 4, team: 'blu' },
        { playerId: 'b', gameClass: 'soldier', skill: 2, team: 'red' },
        { playerId: 'c', gameClass: 'soldier', skill: 3, team: 'red' },
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
          expect(pickTeams(playerIds, overrides)).toEqual([
            { playerId: 'a', gameClass: 'soldier', skill: 1, team: 'blu' },
            { playerId: 'c', gameClass: 'soldier', skill: 3, team: 'blu' },
            { playerId: 'b', gameClass: 'soldier', skill: 2, team: 'red' },
            { playerId: 'd', gameClass: 'soldier', skill: 4, team: 'red' },
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
          expect(pickTeams(playerIds, overrides)).toEqual([
            { playerId: 'a', gameClass: 'soldier', skill: 1, team: 'blu' },
            { playerId: 'd', gameClass: 'soldier', skill: 4, team: 'blu' },
            { playerId: 'b', gameClass: 'soldier', skill: 2, team: 'red' },
            { playerId: 'c', gameClass: 'soldier', skill: 3, team: 'red' },
          ]);
        });
      });
    });
  });

  describe('for 6v6', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: 'scout', skill: 3 },
      { playerId: 'b', gameClass: 'scout', skill: 2 },
      { playerId: 'c', gameClass: 'scout', skill: 2 },
      { playerId: 'd', gameClass: 'scout', skill: 2 },
      { playerId: 'e', gameClass: 'soldier', skill: 4 },
      { playerId: 'f', gameClass: 'soldier', skill: 4 },
      { playerId: 'g', gameClass: 'soldier', skill: 5 },
      { playerId: 'h', gameClass: 'soldier', skill: 4 },
      { playerId: 'i', gameClass: 'demoman', skill: 1 },
      { playerId: 'j', gameClass: 'demoman', skill: 3 },
      { playerId: 'k', gameClass: 'medic', skill: 2 },
      { playerId: 'l', gameClass: 'medic', skill: 4 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(playerIds)).toEqual([
        { playerId: 'a', gameClass: 'scout', skill: 3, team: 'blu' },
        { playerId: 'b', gameClass: 'scout', skill: 2, team: 'blu' },
        { playerId: 'e', gameClass: 'soldier', skill: 4, team: 'blu' },
        { playerId: 'f', gameClass: 'soldier', skill: 4, team: 'blu' },
        { playerId: 'i', gameClass: 'demoman', skill: 1, team: 'blu' },
        { playerId: 'l', gameClass: 'medic', skill: 4, team: 'blu' },
        { playerId: 'c', gameClass: 'scout', skill: 2, team: 'red' },
        { playerId: 'd', gameClass: 'scout', skill: 2, team: 'red' },
        { playerId: 'g', gameClass: 'soldier', skill: 5, team: 'red' },
        { playerId: 'h', gameClass: 'soldier', skill: 4, team: 'red' },
        { playerId: 'j', gameClass: 'demoman', skill: 3, team: 'red' },
        { playerId: 'k', gameClass: 'medic', skill: 2, team: 'red' },
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
        expect(pickTeams(playerIds, overrides)).toEqual([
          { playerId: 'a', gameClass: 'scout', skill: 3, team: 'blu' },
          { playerId: 'b', gameClass: 'scout', skill: 2, team: 'blu' },
          { playerId: 'e', gameClass: 'soldier', skill: 4, team: 'blu' },
          { playerId: 'f', gameClass: 'soldier', skill: 4, team: 'blu' },
          { playerId: 'i', gameClass: 'demoman', skill: 1, team: 'blu' },
          { playerId: 'k', gameClass: 'medic', skill: 2, team: 'blu' },

          { playerId: 'c', gameClass: 'scout', skill: 2, team: 'red' },
          { playerId: 'd', gameClass: 'scout', skill: 2, team: 'red' },
          { playerId: 'g', gameClass: 'soldier', skill: 5, team: 'red' },
          { playerId: 'h', gameClass: 'soldier', skill: 4, team: 'red' },
          { playerId: 'j', gameClass: 'demoman', skill: 3, team: 'red' },
          { playerId: 'l', gameClass: 'medic', skill: 4, team: 'red' },
        ]);
      });
    });

    describe('issue 456', () => {
      const players: PlayerSlot[] = [
        { playerId: 'zinner', gameClass: 'soldier', skill: 4 },
        { playerId: 'mielzky', gameClass: 'soldier', skill: 2 },
        { playerId: 'mejf', gameClass: 'demoman', skill: 3 },
        { playerId: 'wonder', gameClass: 'soldier', skill: 3 },
        { playerId: 'stan', gameClass: 'medic', skill: 4 },
        { playerId: 'cieniu97', gameClass: 'demoman', skill: 2 },
        { playerId: 'bobair', gameClass: 'medic', skill: 1 },
        { playerId: 'kwq', gameClass: 'scout', skill: 7 },
        { playerId: 'antro15cm', gameClass: 'scout', skill: 2 },
        { playerId: 'graba', gameClass: 'scout', skill: 4 },
        { playerId: 'crzje', gameClass: 'scout', skill: 4 },
        { playerId: 'loww', gameClass: 'soldier', skill: 3 },
      ];

      console.log(players);

      const overrides: TeamOverrides = {
        friends: [
          ['bobair', 'kwq'],
          ['stan', 'zinner'],
        ],
      };

      it.only('should pick teams', () => {
        expect(pickTeams(players, overrides)).toEqual([]);
      });
    });
  });

  describe('for 9v9', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: 'scout', skill: 1 },
      { playerId: 'b', gameClass: 'scout', skill: 9 },
      { playerId: 'c', gameClass: 'soldier', skill: 2 },
      { playerId: 'd', gameClass: 'soldier', skill: 8 },
      { playerId: 'e', gameClass: 'pyro', skill: 3 },
      { playerId: 'f', gameClass: 'pyro', skill: 7 },
      { playerId: 'g', gameClass: 'demoman', skill: 4 },
      { playerId: 'h', gameClass: 'demoman', skill: 6 },
      { playerId: 'i', gameClass: 'heavy', skill: 5 },
      { playerId: 'j', gameClass: 'heavy', skill: 5 },
      { playerId: 'k', gameClass: 'engineer', skill: 6 },
      { playerId: 'l', gameClass: 'engineer', skill: 4 },
      { playerId: 'm', gameClass: 'medic', skill: 7 },
      { playerId: 'n', gameClass: 'medic', skill: 3 },
      { playerId: 'o', gameClass: 'sniper', skill: 8 },
      { playerId: 'p', gameClass: 'sniper', skill: 2 },
      { playerId: 'q', gameClass: 'spy', skill: 9 },
      { playerId: 'r', gameClass: 'spy', skill: 1 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(playerIds)).toEqual([
        { playerId: 'a', gameClass: 'scout', skill: 1, team: 'blu' },
        { playerId: 'c', gameClass: 'soldier', skill: 2, team: 'blu' },
        { playerId: 'e', gameClass: 'pyro', skill: 3, team: 'blu' },
        { playerId: 'g', gameClass: 'demoman', skill: 4, team: 'blu' },
        { playerId: 'i', gameClass: 'heavy', skill: 5, team: 'blu' },
        { playerId: 'k', gameClass: 'engineer', skill: 6, team: 'blu' },
        { playerId: 'm', gameClass: 'medic', skill: 7, team: 'blu' },
        { playerId: 'o', gameClass: 'sniper', skill: 8, team: 'blu' },
        { playerId: 'q', gameClass: 'spy', skill: 9, team: 'blu' },
        { playerId: 'b', gameClass: 'scout', skill: 9, team: 'red' },
        { playerId: 'd', gameClass: 'soldier', skill: 8, team: 'red' },
        { playerId: 'f', gameClass: 'pyro', skill: 7, team: 'red' },
        { playerId: 'h', gameClass: 'demoman', skill: 6, team: 'red' },
        { playerId: 'j', gameClass: 'heavy', skill: 5, team: 'red' },
        { playerId: 'l', gameClass: 'engineer', skill: 4, team: 'red' },
        { playerId: 'n', gameClass: 'medic', skill: 3, team: 'red' },
        { playerId: 'p', gameClass: 'sniper', skill: 2, team: 'red' },
        { playerId: 'r', gameClass: 'spy', skill: 1, team: 'red' },
      ]);
    });
  });

  it('should throw an error if trying to make teams of 3 playerIds the same class', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: 'soldier', skill: 1 },
      { playerId: 'b', gameClass: 'soldier', skill: 2 },
      { playerId: 'c', gameClass: 'soldier', skill: 3 },
      { playerId: 'd', gameClass: 'soldier', skill: 4 },
      { playerId: 'e', gameClass: 'soldier', skill: 5 },
      { playerId: 'f', gameClass: 'soldier', skill: 6 },
    ];

    expect(() => pickTeams(playerIds)).toThrow();
  });

  it('should throw an error if playerId count is not even', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: 'soldier', skill: 1 },
      { playerId: 'b', gameClass: 'soldier', skill: 2 },
      { playerId: 'c', gameClass: 'soldier', skill: 3 },
    ];

    expect(() => pickTeams(playerIds)).toThrow();
  });
});
