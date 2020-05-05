import { Injectable, HttpService } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { map } from 'rxjs/operators';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: 'bearer';
}

const twitchOauth2AuthorizeUrl = 'https://id.twitch.tv/oauth2/authorize';
const twitchOauth2TokenUrl = 'https://id.twitch.tv/oauth2/token';

@Injectable()
export class TwitchAuthService {

  private readonly redirectUri = `${this.environment.apiUrl}/twitch/auth/return`;

  constructor(
    private environment: Environment,
    private httpService: HttpService,
  ) { }

  get oauthRedirectUrl() {
    // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth
    return `${twitchOauth2AuthorizeUrl}` +
      `?client_id=${this.environment.twitchClientId}` +
      `&redirect_uri=${this.redirectUri}` +
      `&response_type=code` +
      `&scope=user_read`;
  }

  async fetchToken(code: string) {
    return this.httpService.post<TokenResponse>(
      `${twitchOauth2TokenUrl}` +
      `?client_id=${this.environment.twitchClientId}` +
      `&client_secret=${this.environment.twitchClientSecret}` +
      `&code=${code}` +
      `&grant_type=authorization_code` +
      `&redirect_uri=${this.redirectUri}`
    ).pipe(
      map(response => response.data.access_token),
    ).toPromise();
  }

}
