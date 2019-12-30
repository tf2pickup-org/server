import { Injectable } from '@nestjs/common';
import { parse } from 'dotenv';
import { readFileSync } from 'fs';

@Injectable()
export class Environment {

  private readonly config: Record<string, string>;

  constructor(filePath: string) {
    this.config = parse(readFileSync(filePath));
  }

  get(key: string): string {
    return this.config[key];
  }

  get apiUrl() {
    return this.config.API_URL;
  }

  get clientUrl() {
    return this.config.CLIENT_URL;
  }

  get steamApiKey() {
    return this.config.STEAM_API_KEY;
  }

  get keyStoreFile() {
    return this.config.KEY_STORE_FILE;
  }

  get keyStorePassphare() {
    return this.config.KEY_STORE_PASSPHARE;
  }

  get superUser() {
    return this.config.SUPER_USER;
  }

  get queueConfig() {
    return this.config.QUEUE_CONFIG;
  }

  get mumbleServerUrl() {
    return this.config.MUMBLE_SERVER_URL;
  }

  get mumbleChannelName() {
    return this.config.MUMBLE_CHANNEL_NAME;
  }

  get requireEtf2lAccount() {
    return this.config.REQUIRE_ETF2L_ACCOUNT;
  }

  get logRelayAddress() {
    return this.config.LOG_RELAY_ADDRESS;
  }

  get logRelayPort() {
    return this.config.LOG_RELAY_PORT;
  }

  get discordBotToken() {
    return this.config.DISCORD_BOT_TOKEN;
  }

  get discordQueueNotificationsChannelId() {
    return this.config.DISCORD_QUEUE_NOTIFICATIONS_CHANNEL_ID;
  }

  get discordAdminNotificationsChannelId() {
    return this.config.DISCORD_ADMIN_NOTIFICATIONS_CHANNEL_ID;
  }

}
