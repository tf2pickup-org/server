export type SteamProfilePhotos = { value: string }[];

export interface SteamProfile {
  provider: 'steam';
  id: string;
  displayName: string;
  photos: SteamProfilePhotos;
}
