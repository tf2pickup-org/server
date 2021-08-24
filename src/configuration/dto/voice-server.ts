import { Equals } from 'class-validator';
import { ConfigurationEntryKey } from '../models/configuration-entry-key';
import { VoiceServer as VoiceServerOptions } from '../models/voice-server';

export class VoiceServer {
  constructor(value: VoiceServerOptions) {
    this.key = ConfigurationEntryKey.voiceServer;
    this.value = value;
  }

  @Equals(ConfigurationEntryKey.voiceServer)
  key: string;

  value: VoiceServerOptions;
}
