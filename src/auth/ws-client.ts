import { Player } from '@/players/models/player';

type LoggedIn = { logged_in: true } & Player;
type NotLoggedIn = { logged_in: false };

export interface WsClient {
  request: {
    user: LoggedIn | NotLoggedIn;
  }
}

export interface AuthorizedWsClient {
  request: {
    user: LoggedIn;
  }
}
