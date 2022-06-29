import { Tf2Team } from '@/games/models/tf2-team';

// converts 'Red' and 'Blue' to valid team names
export const fixTeamName = (teamName: string): Tf2Team =>
  teamName.toLowerCase().substring(0, 3) as Tf2Team;
