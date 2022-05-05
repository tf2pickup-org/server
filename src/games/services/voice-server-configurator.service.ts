import { Environment } from '@/environment/environment';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { version } from '../../../package.json';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const connect = require('mumble-client-tcp');

@Injectable()
export class VoiceServerConfiguratorService
  implements OnModuleInit, OnModuleDestroy
{
  private logger = new Logger(VoiceServerConfiguratorService.name);
  private mumbleClient;

  constructor(private environment: Environment) {}

  async onModuleInit() {
    this.mumbleClient = await connect('mumble.melkor.tf', 64738, {
      username: this.environment.botName,
      clientSoftware: `tf2pickup.org ${version}`,
    });
    this.logger.log(`Mumble bot username: ${this.mumbleClient.self.username}`);

    this.mumbleClient.setSelfDeaf(true);
    this.mumbleClient.setSelfComment('DUPA');

    const channel = this.mumbleClient.getChannel('tf2pickup-pl');
    if (channel) {
      this.logger.debug(`channel id=${channel._id}`);
      this.mumbleClient.self.setChannel(channel);
      this.mumbleClient._send({
        name: 'ChannelState',
        payload: {
          parent: channel._id,
          name: 'test',
          temporary: true,
          description: 'chuj',
        },
      });
    }
  }

  onModuleDestroy() {
    this.mumbleClient?.disconnect();
  }
}
