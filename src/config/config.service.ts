import { Injectable } from '@nestjs/common';
import { parse } from 'dotenv';
import { readFileSync } from 'fs';

@Injectable()
export class ConfigService {

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

}
