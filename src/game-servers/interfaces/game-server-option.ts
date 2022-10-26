export interface GameServerOption {
  id: string;
  name: string;
  flag?: string;
}

export interface GameServerOptionWithProvider extends GameServerOption {
  provider: string;
}

export interface GameServerOptionIdentifier {
  id: string;
  provider: string;
}
