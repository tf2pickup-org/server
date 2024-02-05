import { Certificate } from '@/certificates/models/certificate';
import { Game } from '@/games/models/game';
import { Tf2Team } from '@/games/models/tf2-team';
import { Logger } from '@nestjs/common';
import { Channel, Client, User } from '@tf2pickup-org/mumble-client';
import { toUpper } from 'lodash';
import { MumbleChannelDoesNotExistError } from './errors/mumble-channel-does-not-exist.error';
import { MumbleClientNotConnectedError } from './errors/mumble-client-not-connected.error';
import { assertIsError } from '@/utils/assert-is-error';

interface MumbleBotOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  tokens?: string[];
  clientName?: string;
  certificate: Certificate;
  targetChannelName: string;
}

function assertChannelExists(
  channel: Channel | undefined,
  channelName: string,
): asserts channel is Channel {
  if (!channel) {
    throw new MumbleChannelDoesNotExistError(channelName);
  }
}

function assertClientIsConnected(
  client: Client,
): asserts client is Client & { user: User } {
  if (!client.user) {
    throw new MumbleClientNotConnectedError({
      host: client.options.host,
      port: client.options.port,
      username: client.options.username,
    });
  }
}

// subchannels for each game
const subChannelNames = [toUpper(Tf2Team.blu), toUpper(Tf2Team.red)];

export class MumbleBot {
  private readonly client: Client;
  private readonly logger = new Logger(MumbleBot.name);

  constructor(public readonly options: MumbleBotOptions) {
    this.client = new Client({
      host: this.options.host,
      port: this.options.port,
      username: this.options.username,
      password: this.options.password,
      clientName: this.options.clientName,
      key: this.options.certificate.clientKey,
      cert: this.options.certificate.certificate,
      rejectUnauthorized: false,
    });
  }

  async connect() {
    await this.client.connect();
    assertClientIsConnected(this.client);
    this.logger.log(`logged in as ${this.client.user.name}`);
    this.logger.debug(this.client.welcomeText);
    await this.client.user?.setSelfDeaf(true);
    await this.moveToTargetChannel();

    const permissions = await this.client.user.channel.getPermissions();
    if (!permissions.canCreateChannel) {
      this.logger.warn(
        `Bot ${this.client.user.name} does not have permissions to create new channels`,
      );
    }
  }

  disconnect() {
    this.client.disconnect();
  }

  async setupChannels(game: Game) {
    assertClientIsConnected(this.client);
    await this.moveToTargetChannel();
    const channelName = `${game.number}`;
    const channel =
      await this.client.user.channel.createSubChannel(channelName);
    await Promise.all(
      subChannelNames.map(
        async (subChannelName) =>
          await channel.createSubChannel(subChannelName),
      ),
    );
    this.logger.verbose(`channels for game #${game.number} created`);
  }

  async linkChannels(game: Game) {
    assertClientIsConnected(this.client);
    const channelName = `${game.number}`;
    const gameChannel = this.client.user.channel.subChannels.find(
      (channel) => channel.name === channelName,
    );
    if (!gameChannel) {
      throw new Error('channel does not exist');
    }

    const [red, blu] = [
      gameChannel.subChannels.find(
        (channel) => channel.name?.toUpperCase() === 'RED',
      ),
      gameChannel.subChannels.find(
        (channel) => channel.name?.toUpperCase() === 'BLU',
      ),
    ];
    if (red && blu) {
      await red.link(blu);
      this.logger.verbose(`channels for game #${game.number} linked`);
    } else {
      throw new Error('BLU or RED subchannel does not exist');
    }
  }

  async removeObsoleteChannels(runningGames: Game[]) {
    assertClientIsConnected(this.client);
    await this.moveToTargetChannel();

    /**
     * For each channel lookup the assigned game and see whether it has ended.
     * For ended games, make sure there are no players in the corresponding voice channel and then remove it.
     */
    await Promise.all(
      this.client.user.channel.subChannels.map(async (channel) => {
        try {
          if (!channel.name) {
            return;
          }

          const gameNumber = parseInt(channel.name, 10);
          if (isNaN(gameNumber)) {
            return;
          }

          if (runningGames.find((game) => game.number === gameNumber)) {
            return;
          }

          const userCount =
            channel.subChannels
              .map((c) => c.users.length)
              .reduce((prev, curr) => prev + curr, 0) + channel.users.length;

          if (userCount > 0) {
            return;
          }

          await channel.remove();
          this.logger.verbose(`channel ${channel.name} removed`);
        } catch (error) {
          assertIsError(error);
          this.logger.error(
            `cannot remove channel ${channel.name}: ${error.message}`,
          );
        }
      }),
    );
  }

  private async moveToTargetChannel() {
    const channel = this.client.channels.byName(this.options.targetChannelName);
    assertChannelExists(channel, this.options.targetChannelName);
    await this.client.user?.moveToChannel(channel.id);
  }
}
