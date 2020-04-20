import { pickTeams, PlayerSlot, TeamOverrides } from './pick-teams';

describe('pickTeams', () => {
  describe('without team overrides', () => {
    it('should pick teams for 4 slots', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'soldier', skill: 1 },
        { playerId: '1', gameClass: 'soldier', skill: 2 },
        { playerId: '2', gameClass: 'soldier', skill: 3 },
        { playerId: '3', gameClass: 'soldier', skill: 4 },
      ];
      const gameClasses = ['soldier'];

      const gamePlayers = pickTeams(players, gameClasses);
      expect(gamePlayers.length).toBe(4);
      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(2);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(2);

      expect(gamePlayers.find(p => p.playerId === '0').teamId)
        .toEqual(gamePlayers.find(p => p.playerId === '3').teamId);

      expect(gamePlayers.find(p => p.playerId === '1').teamId)
        .toEqual(gamePlayers.find(p => p.playerId === '2').teamId);
    });

    it('should pick teams for 12 slots', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'scout', skill: 2 },
        { playerId: '1', gameClass: 'scout', skill: 2 },
        { playerId: '2', gameClass: 'scout', skill: 2 },
        { playerId: '3', gameClass: 'scout', skill: 2 },
        { playerId: '4', gameClass: 'soldier', skill: 4 },
        { playerId: '5', gameClass: 'soldier', skill: 4 },
        { playerId: '6', gameClass: 'soldier', skill: 5 },
        { playerId: '7', gameClass: 'soldier', skill: 4 },
        { playerId: '0', gameClass: 'demoman', skill: 1 },
        { playerId: '1', gameClass: 'demoman', skill: 3 },
        { playerId: '2', gameClass: 'medic', skill: 2 },
        { playerId: '3', gameClass: 'medic', skill: 4 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(6);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(6);
    });

    it('should pick teams for 18 slots', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'scout', skill: 1 },
        { playerId: '1', gameClass: 'scout', skill: 9 },
        { playerId: '2', gameClass: 'soldier', skill: 2 },
        { playerId: '3', gameClass: 'soldier', skill: 8 },
        { playerId: '4', gameClass: 'pyro', skill: 3 },
        { playerId: '5', gameClass: 'pyro', skill: 7 },
        { playerId: '6', gameClass: 'demoman', skill: 4 },
        { playerId: '7', gameClass: 'demoman', skill: 6 },
        { playerId: '8', gameClass: 'heavy', skill: 5 },
        { playerId: '9', gameClass: 'heavy', skill: 5 },
        { playerId: '10', gameClass: 'engineer', skill: 6 },
        { playerId: '11', gameClass: 'engineer', skill: 4 },
        { playerId: '12', gameClass: 'medic', skill: 7 },
        { playerId: '13', gameClass: 'medic', skill: 3 },
        { playerId: '14', gameClass: 'sniper', skill: 8 },
        { playerId: '15', gameClass: 'sniper', skill: 2 },
        { playerId: '16', gameClass: 'spy', skill: 9 },
        { playerId: '17', gameClass: 'spy', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(9);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(9);
    });

    it('should pick teams with minimum skill difference possible', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'scout', skill: 1 },
        { playerId: '1', gameClass: 'scout', skill: 1 },
        { playerId: '2', gameClass: 'scout', skill: 1 },
        { playerId: '3', gameClass: 'scout', skill: 1 },
        { playerId: '4', gameClass: 'soldier', skill: 1 },
        { playerId: '5', gameClass: 'soldier', skill: 1 },
        { playerId: '6', gameClass: 'soldier', skill: 5 },
        { playerId: '7', gameClass: 'soldier', skill: 1 },
        { playerId: '8', gameClass: 'demoman', skill: 1 },
        { playerId: '9', gameClass: 'demoman', skill: 1 },
        { playerId: '10', gameClass: 'medic', skill: 3 },
        { playerId: '11', gameClass: 'medic', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(6);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(6);

      expect(gamePlayers.find(p => p.playerId === '6').teamId)
        .not
        .toEqual(gamePlayers.find(p => p.playerId === '10').teamId);
    });
  });

  describe('with team overrides', () => {
    it('should pick teams for 4 slots with friends', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'soldier', skill: 1 },
        { playerId: '1', gameClass: 'soldier', skill: 2 },
        { playerId: '2', gameClass: 'soldier', skill: 3 },
        { playerId: '3', gameClass: 'soldier', skill: 4 },
      ];
      const gameClasses = ['soldier'];
      const overrides: TeamOverrides = {
        friends: [
          [ '0', '2' ],
        ],
      };

      const gamePlayers = pickTeams(players, gameClasses, overrides);
      expect(gamePlayers.length).toBe(4);
      expect(gamePlayers.find(p => p.playerId === '0').teamId)
        .toEqual(gamePlayers.find(p => p.playerId === '2').teamId);
    });

    it('should pick teams for 12 slots with friends', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'scout', skill: 1 },
        { playerId: '1', gameClass: 'scout', skill: 1 },
        { playerId: '2', gameClass: 'scout', skill: 1 },
        { playerId: '3', gameClass: 'scout', skill: 1 },
        { playerId: '4', gameClass: 'soldier', skill: 1 },
        { playerId: '5', gameClass: 'soldier', skill: 1 },
        { playerId: '6', gameClass: 'soldier', skill: 5 },
        { playerId: '7', gameClass: 'soldier', skill: 1 },
        { playerId: '8', gameClass: 'demoman', skill: 1 },
        { playerId: '9', gameClass: 'demoman', skill: 1 },
        { playerId: '10', gameClass: 'medic', skill: 3 },
        { playerId: '11', gameClass: 'medic', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const overrides: TeamOverrides = {
        friends: [
          [ '10', '6' ],
        ],
      };
      const gamePlayers = pickTeams(players, gameClasses, overrides);

      expect(gamePlayers.find(p => p.playerId === '10').teamId)
        .toEqual(gamePlayers.find(p => p.playerId === '6').teamId);
    });

    it('should pick teams for 12 slots with friend pairs', () => {
      const players: PlayerSlot[] = [
        { playerId: '0', gameClass: 'scout', skill: 1 },
        { playerId: '1', gameClass: 'scout', skill: 1 },
        { playerId: '2', gameClass: 'scout', skill: 1 },
        { playerId: '3', gameClass: 'scout', skill: 1 },
        { playerId: '4', gameClass: 'soldier', skill: 1 },
        { playerId: '5', gameClass: 'soldier', skill: 1 },
        { playerId: '6', gameClass: 'soldier', skill: 5 },
        { playerId: '7', gameClass: 'soldier', skill: 1 },
        { playerId: '8', gameClass: 'demoman', skill: 1 },
        { playerId: '9', gameClass: 'demoman', skill: 1 },
        { playerId: '10', gameClass: 'medic', skill: 3 },
        { playerId: '11', gameClass: 'medic', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const overrides: TeamOverrides = {
        friends: [
          [ '10', '6' ],
          [ '11', '0' ],
        ],
      };
      const gamePlayers = pickTeams(players, gameClasses, overrides);

      expect(gamePlayers.find(p => p.playerId === '10').teamId)
        .toEqual(gamePlayers.find(p => p.playerId === '6').teamId);
      expect(gamePlayers.find(p => p.playerId === '11').teamId)
        .toEqual(gamePlayers.find(p => p.playerId === '0').teamId);
    });
  });
});
