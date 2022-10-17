export interface GameServerDetails {
  id: string;
  name: string;
  address: string;
  port: number;
}

export interface GameServerDetailsWithProvider extends GameServerDetails {
  provider: string;
}
