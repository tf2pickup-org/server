export interface GameServerOption {
  id: string;
  name: string;
  address: string;
  port: number;
}

export interface GameServerOptionWithProvider extends GameServerOption {
  provider: string;
}
