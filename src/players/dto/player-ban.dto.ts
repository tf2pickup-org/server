export interface PlayerBanDto {
  id: string;
  player: string;
  admin: string;
  start: string;
  end: string;
  reason?: string;
}
