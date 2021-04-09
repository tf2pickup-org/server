export interface Etf2lProfile {
  id: number;
  name: string;
  country: string;
  classes: string[];
  bans?: { end: number; reason: string; start: number }[];
  registered?: number;
  steam?: {
    avatar: string;
    id: string;
    id3: string;
    id64: string;
  };
  teams?: any[];
  title?: string;
  urls?: {
    results: string;
    self: string;
    transfers: string;
  };
}
