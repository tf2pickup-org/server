import { Equals } from 'class-validator';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import { MumbleOptions } from '../models/mumble-options';

export class VoiceServer {
  constructor(value: MumbleOptions) {
    this.key = ConfigurationEntryKey.voiceServer;
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.voiceServer)
  key: string;

  value: MumbleOptions;
}
