import { Injectable, Logger } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { map } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: 'bearer';
}

interface AppAccessTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: 'bearer';
}

const twitchOauth2AuthorizeUrl = 'https://id.twitch.tv/oauth2/authorize';
const twitchOauth2TokenUrl = 'https://id.twitch.tv/oauth2/token';

@Injectable()
export class TwitchAuthService {
  private readonly redirectUri = `${this.environment.apiUrl}/twitch/auth/return`;
  private logger = new Logger(TwitchAuthService.name);
  private appAccessToken: string;
  private tokenExpirationDate: Date;

  constructor(
    private environment: Environment,
    private httpService: HttpService,
  ) {}

  getOauthRedirectUrl(state: string) {
    // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth
    return (
      `${twitchOauth2AuthorizeUrl}` +
      `?client_id=${this.environment.twitchClientId}` +
      `&redirect_uri=${this.redirectUri}` +
      `&response_type=code` +
      `&scope=user_read` +
      `&state=${state}`
    );
  }

  async fetchUserAccessToken(code: string) {
    return this.httpService
      .post<TokenResponse>(
        `${twitchOauth2TokenUrl}` +
          `?client_id=${this.environment.twitchClientId}` +
          `&client_secret=${this.environment.twitchClientSecret}` +
          `&code=${code}` +
          `&grant_type=authorization_code` +
          `&redirect_uri=${this.redirectUri}`,
      )
      .pipe(map((response) => response.data.access_token))
      .toPromise();
  }

  async getAppAccessToken() {
    if (
      this.appAccessToken &&
      this.tokenExpirationDate &&
      this.tokenExpirationDate > new Date()
    ) {
      return this.appAccessToken;
    }

    const { accessToken, expiresIn } = await this.fetchAppAccessToken();
    this.appAccessToken = accessToken;
    this.tokenExpirationDate = new Date();
    this.tokenExpirationDate.setSeconds(
      this.tokenExpirationDate.getSeconds() + expiresIn,
    );
    this.logger.debug('app access token refreshed');
    this.logger.debug(`the new token expires at ${this.tokenExpirationDate}`);
    return this.appAccessToken;
  }

  private fetchAppAccessToken() {
    return this.httpService
      .post<AppAccessTokenResponse>(
        twitchOauth2TokenUrl,
        {},
        {
          params: {
            client_id: this.environment.twitchClientId,
            client_secret: this.environment.twitchClientSecret,
            grant_type: 'client_credentials',
          },
        },
      )
      .pipe(
        map((response) => ({
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in,
        })),
      )
      .toPromise();
  }
}
