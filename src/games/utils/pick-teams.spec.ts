import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { pickTeams, PlayerSlot, TeamOverrides } from './pick-teams';

describe('pickTeams', () => {
  describe('for 2v2', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: Tf2ClassName.soldier, skill: 1 },
      { playerId: 'b', gameClass: Tf2ClassName.soldier, skill: 2 },
      { playerId: 'c', gameClass: Tf2ClassName.soldier, skill: 3 },
      { playerId: 'd', gameClass: Tf2ClassName.soldier, skill: 4 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(playerIds)).toEqual([
        {
          playerId: 'a',
          gameClass: Tf2ClassName.soldier,
          skill: 1,
          team: 'blu',
        },
        {
          playerId: 'd',
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'blu',
        },
        {
          playerId: 'b',
          gameClass: Tf2ClassName.soldier,
          skill: 2,
          team: 'red',
        },
        {
          playerId: 'c',
          gameClass: Tf2ClassName.soldier,
          skill: 3,
          team: 'red',
        },
      ]);
    });

    describe('with friends', () => {
      describe('having all the friends valid', () => {
        const overrides: TeamOverrides = {
          friends: [
            ['a', 'c'], // 'a' and 'c' will be in the same team
          ],
        };

        it('should pick teams', () => {
          expect(pickTeams(playerIds, overrides)).toEqual([
            {
              playerId: 'a',
              gameClass: Tf2ClassName.soldier,
              skill: 1,
              team: 'blu',
            },
            {
              playerId: 'c',
              gameClass: Tf2ClassName.soldier,
              skill: 3,
              team: 'blu',
            },
            {
              playerId: 'b',
              gameClass: Tf2ClassName.soldier,
              skill: 2,
              team: 'red',
            },
            {
              playerId: 'd',
              gameClass: Tf2ClassName.soldier,
              skill: 4,
              team: 'red',
            },
          ]);
        });
      });

      describe('missing one friend', () => {
        const overrides: TeamOverrides = {
          friends: [['a', 'e']],
        };

        it('should pick teams', () => {
          expect(pickTeams(playerIds, overrides)).toEqual([
            {
              playerId: 'a',
              gameClass: Tf2ClassName.soldier,
              skill: 1,
              team: 'blu',
            },
            {
              playerId: 'd',
              gameClass: Tf2ClassName.soldier,
              skill: 4,
              team: 'blu',
            },
            {
              playerId: 'b',
              gameClass: Tf2ClassName.soldier,
              skill: 2,
              team: 'red',
            },
            {
              playerId: 'c',
              gameClass: Tf2ClassName.soldier,
              skill: 3,
              team: 'red',
            },
          ]);
        });
      });
    });
  });

  describe('for 6v6', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: Tf2ClassName.scout, skill: 3 },
      { playerId: 'b', gameClass: Tf2ClassName.scout, skill: 2 },
      { playerId: 'c', gameClass: Tf2ClassName.scout, skill: 2 },
      { playerId: 'd', gameClass: Tf2ClassName.scout, skill: 2 },
      { playerId: 'e', gameClass: Tf2ClassName.soldier, skill: 4 },
      { playerId: 'f', gameClass: Tf2ClassName.soldier, skill: 4 },
      { playerId: 'g', gameClass: Tf2ClassName.soldier, skill: 5 },
      { playerId: 'h', gameClass: Tf2ClassName.soldier, skill: 4 },
      { playerId: 'i', gameClass: Tf2ClassName.demoman, skill: 1 },
      { playerId: 'j', gameClass: Tf2ClassName.demoman, skill: 3 },
      { playerId: 'k', gameClass: Tf2ClassName.medic, skill: 2 },
      { playerId: 'l', gameClass: Tf2ClassName.medic, skill: 4 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(playerIds)).toEqual([
        { playerId: 'a', gameClass: Tf2ClassName.scout, skill: 3, team: 'blu' },
        { playerId: 'b', gameClass: Tf2ClassName.scout, skill: 2, team: 'blu' },
        {
          playerId: 'e',
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'blu',
        },
        {
          playerId: 'f',
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'blu',
        },
        {
          playerId: 'i',
          gameClass: Tf2ClassName.demoman,
          skill: 1,
          team: 'blu',
        },
        { playerId: 'l', gameClass: Tf2ClassName.medic, skill: 4, team: 'blu' },
        { playerId: 'c', gameClass: Tf2ClassName.scout, skill: 2, team: 'red' },
        { playerId: 'd', gameClass: Tf2ClassName.scout, skill: 2, team: 'red' },
        {
          playerId: 'g',
          gameClass: Tf2ClassName.soldier,
          skill: 5,
          team: 'red',
        },
        {
          playerId: 'h',
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'red',
        },
        {
          playerId: 'j',
          gameClass: Tf2ClassName.demoman,
          skill: 3,
          team: 'red',
        },
        { playerId: 'k', gameClass: Tf2ClassName.medic, skill: 2, team: 'red' },
      ]);
    });

    describe('with friends', () => {
      const overrides: TeamOverrides = {
        friends: [
          ['k', 'i'],
          ['l', 'g'],
        ],
      };

      it('should pick teams', () => {
        expect(pickTeams(playerIds, overrides)).toEqual([
          {
            playerId: 'a',
            gameClass: Tf2ClassName.scout,
            skill: 3,
            team: 'blu',
          },
          {
            playerId: 'b',
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'blu',
          },
          {
            playerId: 'e',
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'blu',
          },
          {
            playerId: 'f',
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'blu',
          },
          {
            playerId: 'i',
            gameClass: Tf2ClassName.demoman,
            skill: 1,
            team: 'blu',
          },
          {
            playerId: 'k',
            gameClass: Tf2ClassName.medic,
            skill: 2,
            team: 'blu',
          },

          {
            playerId: 'c',
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'red',
          },
          {
            playerId: 'd',
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'red',
          },
          {
            playerId: 'g',
            gameClass: Tf2ClassName.soldier,
            skill: 5,
            team: 'red',
          },
          {
            playerId: 'h',
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'red',
          },
          {
            playerId: 'j',
            gameClass: Tf2ClassName.demoman,
            skill: 3,
            team: 'red',
          },
          {
            playerId: 'l',
            gameClass: Tf2ClassName.medic,
            skill: 4,
            team: 'red',
          },
        ]);
      });
    });

    describe('issue 456', () => {
      const players: PlayerSlot[] = [
        { playerId: 'zinner', gameClass: Tf2ClassName.soldier, skill: 4 },
        { playerId: 'mielzky', gameClass: Tf2ClassName.soldier, skill: 2 },
        { playerId: 'mejf', gameClass: Tf2ClassName.demoman, skill: 3 },
        { playerId: 'wonder', gameClass: Tf2ClassName.soldier, skill: 3 },
        { playerId: 'stan', gameClass: Tf2ClassName.medic, skill: 4 },
        { playerId: 'cieniu97', gameClass: Tf2ClassName.demoman, skill: 2 },
        { playerId: 'bobair', gameClass: Tf2ClassName.medic, skill: 1 },
        { playerId: 'kwq', gameClass: Tf2ClassName.scout, skill: 7 },
        { playerId: 'antro15cm', gameClass: Tf2ClassName.scout, skill: 2 },
        { playerId: 'graba', gameClass: Tf2ClassName.scout, skill: 4 },
        { playerId: 'crzje', gameClass: Tf2ClassName.scout, skill: 4 },
        { playerId: 'loww', gameClass: Tf2ClassName.soldier, skill: 3 },
      ];

      const overrides: TeamOverrides = {
        friends: [
          ['bobair', 'kwq'],
          ['stan', 'zinner'],
        ],
      };

      it('should pick teams', () => {
        expect(pickTeams(players, overrides)).toEqual([
          {
            playerId: 'zinner',
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'blu',
          },
          {
            playerId: 'mielzky',
            gameClass: Tf2ClassName.soldier,
            skill: 2,
            team: 'blu',
          },
          {
            playerId: 'cieniu97',
            gameClass: Tf2ClassName.demoman,
            skill: 2,
            team: 'blu',
          },
          {
            playerId: 'stan',
            gameClass: Tf2ClassName.medic,
            skill: 4,
            team: 'blu',
          },
          {
            playerId: 'graba',
            gameClass: Tf2ClassName.scout,
            skill: 4,
            team: 'blu',
          },
          {
            playerId: 'crzje',
            gameClass: Tf2ClassName.scout,
            skill: 4,
            team: 'blu',
          },

          {
            playerId: 'wonder',
            gameClass: Tf2ClassName.soldier,
            skill: 3,
            team: 'red',
          },
          {
            playerId: 'loww',
            gameClass: Tf2ClassName.soldier,
            skill: 3,
            team: 'red',
          },
          {
            playerId: 'mejf',
            gameClass: Tf2ClassName.demoman,
            skill: 3,
            team: 'red',
          },
          {
            playerId: 'bobair',
            gameClass: Tf2ClassName.medic,
            skill: 1,
            team: 'red',
          },
          {
            playerId: 'kwq',
            gameClass: Tf2ClassName.scout,
            skill: 7,
            team: 'red',
          },
          {
            playerId: 'antro15cm',
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'red',
          },
        ]);
      });
    });
  });

  describe('for 9v9', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: Tf2ClassName.scout, skill: 1 },
      { playerId: 'b', gameClass: Tf2ClassName.scout, skill: 9 },
      { playerId: 'c', gameClass: Tf2ClassName.soldier, skill: 2 },
      { playerId: 'd', gameClass: Tf2ClassName.soldier, skill: 8 },
      { playerId: 'e', gameClass: Tf2ClassName.pyro, skill: 3 },
      { playerId: 'f', gameClass: Tf2ClassName.pyro, skill: 7 },
      { playerId: 'g', gameClass: Tf2ClassName.demoman, skill: 4 },
      { playerId: 'h', gameClass: Tf2ClassName.demoman, skill: 6 },
      { playerId: 'i', gameClass: Tf2ClassName.heavy, skill: 5 },
      { playerId: 'j', gameClass: Tf2ClassName.heavy, skill: 5 },
      { playerId: 'k', gameClass: Tf2ClassName.engineer, skill: 6 },
      { playerId: 'l', gameClass: Tf2ClassName.engineer, skill: 4 },
      { playerId: 'm', gameClass: Tf2ClassName.medic, skill: 7 },
      { playerId: 'n', gameClass: Tf2ClassName.medic, skill: 3 },
      { playerId: 'o', gameClass: Tf2ClassName.sniper, skill: 8 },
      { playerId: 'p', gameClass: Tf2ClassName.sniper, skill: 2 },
      { playerId: 'q', gameClass: Tf2ClassName.spy, skill: 9 },
      { playerId: 'r', gameClass: Tf2ClassName.spy, skill: 1 },
    ];

    it('should pick teams', () => {
      expect(pickTeams(playerIds)).toEqual([
        { playerId: 'a', gameClass: Tf2ClassName.scout, skill: 1, team: 'blu' },
        {
          playerId: 'c',
          gameClass: Tf2ClassName.soldier,
          skill: 2,
          team: 'blu',
        },
        { playerId: 'e', gameClass: Tf2ClassName.pyro, skill: 3, team: 'blu' },
        {
          playerId: 'g',
          gameClass: Tf2ClassName.demoman,
          skill: 4,
          team: 'blu',
        },
        { playerId: 'i', gameClass: Tf2ClassName.heavy, skill: 5, team: 'blu' },
        {
          playerId: 'k',
          gameClass: Tf2ClassName.engineer,
          skill: 6,
          team: 'blu',
        },
        { playerId: 'm', gameClass: Tf2ClassName.medic, skill: 7, team: 'blu' },
        {
          playerId: 'o',
          gameClass: Tf2ClassName.sniper,
          skill: 8,
          team: 'blu',
        },
        { playerId: 'q', gameClass: Tf2ClassName.spy, skill: 9, team: 'blu' },
        { playerId: 'b', gameClass: Tf2ClassName.scout, skill: 9, team: 'red' },
        {
          playerId: 'd',
          gameClass: Tf2ClassName.soldier,
          skill: 8,
          team: 'red',
        },
        { playerId: 'f', gameClass: Tf2ClassName.pyro, skill: 7, team: 'red' },
        {
          playerId: 'h',
          gameClass: Tf2ClassName.demoman,
          skill: 6,
          team: 'red',
        },
        { playerId: 'j', gameClass: Tf2ClassName.heavy, skill: 5, team: 'red' },
        {
          playerId: 'l',
          gameClass: Tf2ClassName.engineer,
          skill: 4,
          team: 'red',
        },
        { playerId: 'n', gameClass: Tf2ClassName.medic, skill: 3, team: 'red' },
        {
          playerId: 'p',
          gameClass: Tf2ClassName.sniper,
          skill: 2,
          team: 'red',
        },
        { playerId: 'r', gameClass: Tf2ClassName.spy, skill: 1, team: 'red' },
      ]);
    });
  });

  it('should throw an error if trying to make teams of 3 playerIds the same class', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: Tf2ClassName.soldier, skill: 1 },
      { playerId: 'b', gameClass: Tf2ClassName.soldier, skill: 2 },
      { playerId: 'c', gameClass: Tf2ClassName.soldier, skill: 3 },
      { playerId: 'd', gameClass: Tf2ClassName.soldier, skill: 4 },
      { playerId: 'e', gameClass: Tf2ClassName.soldier, skill: 5 },
      { playerId: 'f', gameClass: Tf2ClassName.soldier, skill: 6 },
    ];

    expect(() => pickTeams(playerIds)).toThrow();
  });

  it('should throw an error if playerId count is not even', () => {
    const playerIds: PlayerSlot[] = [
      { playerId: 'a', gameClass: Tf2ClassName.soldier, skill: 1 },
      { playerId: 'b', gameClass: Tf2ClassName.soldier, skill: 2 },
      { playerId: 'c', gameClass: Tf2ClassName.soldier, skill: 3 },
    ];

    expect(() => pickTeams(playerIds)).toThrow();
  });
});
