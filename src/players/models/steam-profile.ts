export interface SteamProfile {
  provider: 'steam';
  id: string;
  displayName: string;
  photos: Array<{ value: string; }>;
}
