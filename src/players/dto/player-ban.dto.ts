export interface PlayerBanDto {
  id: string;
  player: string;
  admin: string;
  start: Date;
  end: Date;
  reason?: string;
}
