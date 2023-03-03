interface Etf2lCompetition {
  category: string;
  competition: string;
  division: {
    name: string | null;
    skill_contrib: number | null;
    tier: number | null;
  };
  url: string;
}

interface Etf2lTeam {
  id: number;
  country: string;
  homepage: string | null;
  irc: {
    channel: string | null;
    network: string | null;
  };
  name: string;
  server: string | null;
  steam: {
    avatar: string;
    steam_group: string | null;
  };
  tag: string | null;
  type: string;
  competitions: Record<string, Etf2lCompetition>;
  urls: {
    matches: string;
    results: string;
    self: string;
    transfers: string;
  };
}

interface Etf2lBan {
  start: number;
  end: number;
  reason: string;
}

export interface Etf2lProfile {
  id: number;
  name: string;
  country: string;
  classes: string[];
  bans: Etf2lBan[] | null;
  registered: number;
  steam: {
    avatar: string;
    id: string;
    id3: string;
    id64: string;
  };
  teams: Etf2lTeam[];
  title: 'Player';
  urls: {
    results: string;
    self: string;
    transfers: string;
  };
}
