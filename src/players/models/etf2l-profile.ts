export interface Etf2lProfile {
  id: number;
  name: string;
  country: string;
  classes: string[];
  bans?: Array<{ end: number, reason: string, start: number }>;
}
