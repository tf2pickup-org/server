import { pickTeams, PlayerSlot, TeamOverrides } from './pick-teams';
import { ObjectId } from 'mongodb';

describe('pickTeams', () => {
  describe('without team overrides', () => {
    it('should pick teams for 4 slots', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 2 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 3 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 4 },
      ];
      const gameClasses = ['soldier'];

      const gamePlayers = pickTeams(players, gameClasses);
      expect(gamePlayers.length).toBe(4);
      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(2);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(2);

      expect(gamePlayers.find(p => players[0].player.equals(p.player as ObjectId)).teamId)
        .toEqual(gamePlayers.find(p => players[3].player.equals(p.player as ObjectId)).teamId);

      expect(gamePlayers.find(p => players[1].player.equals(p.player as ObjectId)).teamId)
        .toEqual(gamePlayers.find(p => players[2].player.equals(p.player as ObjectId)).teamId);
    });

    it('should pick teams for 12 slots', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'scout', skill: 2 },
        { player: new ObjectId(), gameClass: 'scout', skill: 2 },
        { player: new ObjectId(), gameClass: 'scout', skill: 2 },
        { player: new ObjectId(), gameClass: 'scout', skill: 2 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 4 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 4 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 5 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 4 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 3 },
        { player: new ObjectId(), gameClass: 'medic', skill: 2 },
        { player: new ObjectId(), gameClass: 'medic', skill: 4 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(6);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(6);
    });

    it('should pick teams for 18 slots', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 9 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 2 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 8 },
        { player: new ObjectId(), gameClass: 'pyro', skill: 3 },
        { player: new ObjectId(), gameClass: 'pyro', skill: 7 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 4 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 6 },
        { player: new ObjectId(), gameClass: 'heavy', skill: 5 },
        { player: new ObjectId(), gameClass: 'heavy', skill: 5 },
        { player: new ObjectId(), gameClass: 'engineer', skill: 6 },
        { player: new ObjectId(), gameClass: 'engineer', skill: 4 },
        { player: new ObjectId(), gameClass: 'medic', skill: 7 },
        { player: new ObjectId(), gameClass: 'medic', skill: 3 },
        { player: new ObjectId(), gameClass: 'sniper', skill: 8 },
        { player: new ObjectId(), gameClass: 'sniper', skill: 2 },
        { player: new ObjectId(), gameClass: 'spy', skill: 9 },
        { player: new ObjectId(), gameClass: 'spy', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(9);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(9);
    });

    it('should pick teams with minimum skill difference possible', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 5 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'medic', skill: 3 },
        { player: new ObjectId(), gameClass: 'medic', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const gamePlayers = pickTeams(players, gameClasses);

      expect(gamePlayers.filter(p => p.teamId === '0').length).toBe(6);
      expect(gamePlayers.filter(p => p.teamId === '1').length).toBe(6);

      expect(gamePlayers.find(p => players[6].player.equals(p.player as ObjectId)).teamId)
        .not
        .toEqual(gamePlayers.find(p => players[10].player.equals(p.player as ObjectId)).teamId);
    });
  });

  describe('with team overrides', () => {
    it('should pick teams for 4 slots with friends', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 2 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 3 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 4 },
      ];
      const gameClasses = ['soldier'];
      const overrides: TeamOverrides = {
        friends: [
          [ players[0].player, players[2].player ],
        ],
      };

      const gamePlayers = pickTeams(players, gameClasses, overrides);
      expect(gamePlayers.length).toBe(4);
      expect(gamePlayers.find(p => players[0].player.equals(p.player as ObjectId)).teamId)
        .toEqual(gamePlayers.find(p => players[2].player.equals(p.player as ObjectId)).teamId);
    });

    it('should pick teams for 12 slots with friends', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 5 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'medic', skill: 3 },
        { player: new ObjectId(), gameClass: 'medic', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const overrides: TeamOverrides = {
        friends: [
          [ players[10].player, players[6].player ],
        ],
      };
      const gamePlayers = pickTeams(players, gameClasses, overrides);

      expect(gamePlayers.find(p => players[10].player.equals(p.player as ObjectId)).teamId)
        .toEqual(gamePlayers.find(p => players[6].player.equals(p.player as ObjectId)).teamId);
    });

    it('should pick teams for 12 slots with friend pairs', () => {
      const players: PlayerSlot[] = [
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'scout', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 5 },
        { player: new ObjectId(), gameClass: 'soldier', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'demoman', skill: 1 },
        { player: new ObjectId(), gameClass: 'medic', skill: 3 },
        { player: new ObjectId(), gameClass: 'medic', skill: 1 },
      ];
      const gameClasses = ['scout', 'soldier', 'demoman', 'medic'];
      const overrides: TeamOverrides = {
        friends: [
          [ players[10].player, players[6].player ],
          [ players[11].player, players[0].player ],
        ],
      };
      const gamePlayers = pickTeams(players, gameClasses, overrides);

      expect(gamePlayers.find(p => players[10].player.equals(p.player as ObjectId)).teamId)
        .toEqual(gamePlayers.find(p => players[6].player.equals(p.player as ObjectId)).teamId);
      expect(gamePlayers.find(p => players[11].player.equals(p.player as ObjectId)).teamId)
        .toEqual(gamePlayers.find(p => players[0].player.equals(p.player as ObjectId)).teamId);
    });
  });
});
