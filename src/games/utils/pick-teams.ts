import { strict } from 'assert';
import { NotImplementedException } from '@nestjs/common';
import { Tf2Team } from '../models/tf2-team';
import { meanBy } from 'lodash';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface PlayerSlot {
  playerId: string;
  gameClass: Tf2ClassName;
  skill: number; // the skill for the given gameClass
}

export interface PlayerSlotWithTeam extends PlayerSlot {
  team: Tf2Team;
}

export interface TeamOverrides {
  friends: string[][];
}

interface TeamLineup {
  lineup: PlayerSlot[];
}

type TeamId = 0 | 1;
type PossibleLineup = Record<TeamId, TeamLineup>;

/**
 * Make all possible team setups.
 * For 6v6 format, this outputs maximum of 36 combinations (3 * 3 * 2 * 2).
 * For 9v9, it makes 512 teams (2 ^ 9).
 * @return gameClass <=> lineup pairs.
 */
function makeAllPossibleLineups(gameClasses: string[], players: PlayerSlot[]): PossibleLineup[] {
  // First off, let's make all possible lineups for each class.
  // i.e. for scouts (A, B, C, D) make the following:
  // ([A, B], [C, D]), ([A, C], [B, D]), ([A, D], [B, C])
  // for medics (A, B) make only two combinatons:
  // ([A, B]) and ([B, A])
  const gameClassLineups = new Map<string, PossibleLineup[]>();
  for (const gameClass of gameClasses) {
    const playersOfGameClass = players.filter(p => p.gameClass === gameClass);
    strict(playersOfGameClass.length % 2 === 0);

    if (playersOfGameClass.length === 2) {
      gameClassLineups.set(gameClass, [
        {
          0: { lineup: [ playersOfGameClass[0] ] },
          1: { lineup: [ playersOfGameClass[1] ] },
        },
        {
          0: { lineup: [ playersOfGameClass[1] ] },
          1: { lineup: [ playersOfGameClass[0] ] },
        },
      ]);
    } else if (playersOfGameClass.length === 4) {
      gameClassLineups.set(gameClass, [
        {
          0: { lineup: [ playersOfGameClass[0], playersOfGameClass[1] ] },
          1: { lineup: [ playersOfGameClass[2], playersOfGameClass[3] ] },
        },
        {
          0: { lineup: [ playersOfGameClass[0], playersOfGameClass[2] ] },
          1: { lineup: [ playersOfGameClass[1], playersOfGameClass[3] ] },
        },
        {
          0: { lineup: [ playersOfGameClass[0], playersOfGameClass[3] ] },
          1: { lineup: [ playersOfGameClass[1], playersOfGameClass[2] ] },
        },
        {
          0: { lineup: [ playersOfGameClass[2], playersOfGameClass[3] ] },
          1: { lineup: [ playersOfGameClass[0], playersOfGameClass[1] ] },
        },
      ]);
    } else {
      throw new NotImplementedException('more than two players of one class in a team is not implemented');
    }
  }

  // The next thing to do is to make all combinations of the game class lineup possibilities above.
  const possibleLineups: PossibleLineup[] = [];

  function makeLineup(prev: PossibleLineup = { 0: { lineup: [] }, 1: { lineup: [] } }, i = 0) {
    if (i === gameClasses.length) {
      possibleLineups.push(prev);
    } else {
      const gameClass = gameClasses[i];
      const gcLineups = gameClassLineups.get(gameClass);
      for (const lineup of gcLineups) {
        const tmp: PossibleLineup = {
          0: { lineup: [ ...prev[0].lineup, ...lineup[0].lineup ] },
          1: { lineup: [ ...prev[1].lineup, ...lineup[1].lineup ] },
        }
        makeLineup(tmp, i + 1);
      }
    }
  }

  makeLineup();
  return possibleLineups;
}

interface TeamLineupWithSkillAverage extends TeamLineup {
  skillAverage: number;
}

function calculateAverageSkill(lineup: TeamLineup): TeamLineupWithSkillAverage {
  return { ...lineup, skillAverage: meanBy(lineup.lineup, 'skill') };
}

interface LineupWithSkillAverageDifference extends PossibleLineup {
  skillAverageDifference: number;
}

function calculateAverageSkillDifference(lineup: Record<TeamId, TeamLineupWithSkillAverage>): LineupWithSkillAverageDifference {
  return { ...lineup, skillAverageDifference: Math.abs(lineup[0].skillAverage - lineup[1].skillAverage) };
}

function respectsOverrides(lineup: Record<TeamId, TeamLineup>, overrides?: TeamOverrides): boolean {
  if (overrides === undefined) {
    return true;
  }

  function findPlayersTeam(player: string): TeamId | null {
    if (lineup[0].lineup.find(p => p.playerId === player)) {
      return 0;
    } else if (lineup[1].lineup.find(p => p.playerId === player)) {
      return 1;
    } else {
      return null;
    }
  }

  return overrides.friends
    .every(friendPair => [ ...new Set(
      friendPair
        .map(friend => findPlayersTeam(friend))
        .filter(teamId => teamId !== null)
      ) ].length < 2
    );
}

/**
 * From the given pool of players make two teams that make the smallest average skill difference.
 */
export function pickTeams(players: PlayerSlot[], overrides?: TeamOverrides): PlayerSlotWithTeam[] {
  const teams: Record<TeamId, Tf2Team> = { 0: Tf2Team.blu, 1: Tf2Team.red };
  const gameClasses = [ ...new Set(players.map(p => p.gameClass)) ];

  const allPossibleLineups = makeAllPossibleLineups(gameClasses, players)
    .filter(lineup => respectsOverrides(lineup, overrides))
    .map(lineup => {
      return {
        0: calculateAverageSkill(lineup[0]),
        1: calculateAverageSkill(lineup[1]),
      };
    })
    .map(lineup => calculateAverageSkillDifference(lineup))
    .sort((a, b) => a.skillAverageDifference - b.skillAverageDifference);

  const selectedLineup = allPossibleLineups[0];

  return [0, 1]
    .flatMap(teamId => (selectedLineup[teamId] as TeamLineup).lineup
      .map(slot => ({ ...slot, team: teams[teamId] }))
    );
}
