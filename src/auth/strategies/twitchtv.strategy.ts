import { Injectable, HttpService } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Environment } from '@/environment/environment';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { map } from 'rxjs/operators';
import { TwitchUser } from '../models/twitch-user';

interface TwitchGetUsersResponse {
  data: TwitchUser[];
}

const authorizationURL = 'https://id.twitch.tv/oauth2/authorize';
const tokenURL = 'https://id.twitch.tv/oauth2/token';

@Injectable()
export class TwitchTvStrategy extends PassportStrategy(OAuth2Strategy, 'twitchtv') {

  private readonly twitchTvApiEndpoint = 'https://api.twitch.tv/helix';

  constructor(
    private environment: Environment,
    private httpService: HttpService,
  ) {
    super({
      authorizationURL,
      tokenURL,
      clientID: environment.twitchClientId,
      clientSecret: environment.twitchClientSecret,
      callbackURL: `${environment.apiUrl}/auth/twitchtv/return`,
      scope: 'user_read',
    });
  };

  async validate(accessToken: string) {
    // https://dev.twitch.tv/docs/api/reference#get-users
    return this.httpService.get<TwitchGetUsersResponse>(`${this.twitchTvApiEndpoint}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': this.environment.twitchClientId,
      }
    }).pipe(
      map(response => response.data.data[0]),
    ).toPromise();
  }

}
