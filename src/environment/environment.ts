import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Environment {
  constructor(
    private configService: ConfigService<Record<string, unknown>, true>,
  ) {}

  get websiteName() {
    return this.configService.get<string>('WEBSITE_NAME');
  }

  get apiUrl() {
    return this.configService.get<string>('API_URL');
  }

  get clientUrl() {
    return this.configService.get<string>('CLIENT_URL');
  }

  get botName() {
    return this.configService.get<string>('BOT_NAME');
  }

  get mongoDbUri() {
    return this.configService.get<string>('MONGODB_URI');
  }

  get redisUrl() {
    return this.configService.get<string>('REDIS_URL');
  }

  get redisSocket() {
    return this.configService.get<string>('REDIS_SOCKET');
  }

  get steamApiKey() {
    return this.configService.get<string>('STEAM_API_KEY');
  }

  get logsTfApiKey() {
    return this.configService.get<string>('LOGS_TF_API_KEY');
  }

  get keyStoreFile() {
    return this.configService.get<string>('KEY_STORE_FILE');
  }

  get keyStorePassphrase() {
    return this.configService.get<string>('KEY_STORE_PASSPHRASE');
  }

  get superUser() {
    return this.configService.get<string>('SUPER_USER');
  }

  get queueConfig() {
    return this.configService.get<string>('QUEUE_CONFIG');
  }

  get logRelayAddress() {
    return this.configService.get<string>('LOG_RELAY_ADDRESS');
  }

  get logRelayPort() {
    return this.configService.get<string>('LOG_RELAY_PORT');
  }

  get gameServerSecret() {
    return this.configService.get<string>('GAME_SERVER_SECRET');
  }

  get discordBotToken() {
    return this.configService.get<string>('DISCORD_BOT_TOKEN');
  }

  get twitchClientId() {
    return this.configService.get<string>('TWITCH_CLIENT_ID');
  }

  get twitchClientSecret() {
    return this.configService.get<string>('TWITCH_CLIENT_SECRET');
  }

  get servemeTfApiEndpoint() {
    return this.configService.get<string>('SERVEME_TF_API_ENDPOINT');
  }

  get servemeTfApiKey() {
    return this.configService.get<string>('SERVEME_TF_API_KEY');
  }
}
