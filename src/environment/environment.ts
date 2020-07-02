import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Environment {

  constructor(
    private configService: ConfigService,
  ) { }

  get apiUrl() {
    return this.configService.get<string>('API_URL');
  }

  get clientUrl() {
    return this.configService.get<string>('CLIENT_URL');
  }

  get botName() {
    return this.configService.get<string>('BOT_NAME');
  }

  get mongoDbHost() {
    return this.configService.get<string>('MONGODB_HOST');
  }

  get mongoDbPort() {
    return this.configService.get<string>('MONGODB_PORT');
  }

  get mongoDbName() {
    return this.configService.get<string>('MONGODB_DB');
  }

  get mongoDbUsername() {
    return this.configService.get<string>('MONGODB_USERNAME');
  }

  get mongoDbPassword() {
    return this.configService.get<string>('MONGODB_PASSWORD');
  }

  get steamApiKey() {
    return this.configService.get<string>('STEAM_API_KEY');
  }

  get keyStoreFile() {
    return this.configService.get<string>('KEY_STORE_FILE');
  }

  get keyStorePassphare() {
    return this.configService.get<string>('KEY_STORE_PASSPHARE');
  }

  get superUser() {
    return this.configService.get<string>('SUPER_USER');
  }

  get queueConfig() {
    return this.configService.get<string>('QUEUE_CONFIG');
  }

  get mumbleServerUrl() {
    return this.configService.get<string>('MUMBLE_SERVER_URL');
  }

  get mumbleChannelName() {
    return this.configService.get<string>('MUMBLE_CHANNEL_NAME');
  }

  get logRelayAddress() {
    return this.configService.get<string>('LOG_RELAY_ADDRESS');
  }

  get logRelayPort() {
    return this.configService.get<string>('LOG_RELAY_PORT');
  }

  get discordBotToken() {
    return this.configService.get<string>('DISCORD_BOT_TOKEN');
  }

  get discordGuild() {
    return this.configService.get<string>('DISCORD_GUILD');
  }

  get discordQueueNotificationsChannel() {
    return this.configService.get<string>('DISCORD_QUEUE_NOTIFICATIONS_CHANNEL');
  }

  get discordQueueNotificationsMentionRole() {
    return this.configService.get<string>('DISCORD_QUEUE_NOTIFICATIONS_MENTION_ROLE');
  }

  get discordAdminNotificationsChannel() {
    return this.configService.get<string>('DISCORD_ADMIN_NOTIFICATIONS_CHANNEL');
  }

  get twitchClientId() {
    return this.configService.get<string>('TWITCH_CLIENT_ID');
  }

  get twitchClientSecret() {
    return this.configService.get<string>('TWITCH_CLIENT_SECRET');
  }

}
