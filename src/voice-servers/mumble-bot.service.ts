import { Environment } from '@/environment/environment';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { readFile } from 'fs/promises';
import { version } from '../../package.json';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const connect = require('mumble-client-tcp');

@Injectable()
export class MumbleBotService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(MumbleBotService.name);
  private mumbleClient;

  constructor(private readonly environment: Environment) {}

  async onModuleInit() {
    const key = await readFile('mumble-key.pem');
    const cert = await readFile('mumble-cert.pem');

    this.mumbleClient = await connect('mumble.melkor.tf', 64738, {
      tls: {
        key,
        cert,
        rejectUnauthorized: true,
      },
      username: this.environment.botName,
      clientSoftware: `tf2pickup.org ${version}`,
    });
    this.logger.log(`Mumble bot username: ${this.mumbleClient.self.username}`);

    this.mumbleClient.setSelfDeaf(true);

    const channel = this.mumbleClient.getChannel('tf2pickup-pl');
    if (channel) {
      this.logger.debug(`channel id=${channel._id}`);
      this.mumbleClient.self.setChannel(channel);

      setTimeout(() => {
        this.createChannel(channel._id, 'test').then((testChannel) => {
          this.logger.log('CREATED');
          setTimeout(() => {
            this.removeChannel(testChannel._id).then(() => {
              this.logger.log('REMOVED');
            });
          }, 5000);
        });
      }, 3000);
    }
  }

  async onModuleDestroy() {
    this.mumbleClient?.disconnect();
  }

  private async createChannel(
    parentId: string,
    channelName: string,
  ): Promise<any> {
    return new Promise((resolve) => {
      const listener = (channel) => {
        console.log(channel);
        if (channel.name === channelName) {
          this.mumbleClient.off('newChannel', listener);
          resolve(channel);
        }
      };
      this.mumbleClient.on('newChannel', listener);

      this.mumbleClient._send({
        name: 'ChannelState',
        payload: {
          parent: parentId,
          name: channelName,
          temporary: false,
        },
      });
    });
  }

  private async removeChannel(channelId: string): Promise<void> {
    return new Promise((resolve) => {
      const channel = this.mumbleClient._channelById(channelId);
      if (channel) {
        channel.on('remove', resolve);
        this.mumbleClient._send({
          name: 'ChannelRemove',
          payload: {
            channel_id: channelId,
          },
        });
      }
    });
  }
}
