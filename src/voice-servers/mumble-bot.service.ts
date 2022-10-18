import { Environment } from '@/environment/environment';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from '@tf2pickup-org/mumble-client';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { filter } from 'rxjs';
import { CertificatesService } from '@/certificates/services/certificates.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { GameRuntimeService } from '@/game-coordinator/services/game-runtime.service';
import { version } from '../../package.json';
import { ConfigurationEntryKey } from '@/configuration/models/configuration-entry-key';
import { SelectedVoiceServer } from '@/configuration/models/voice-server';

@Injectable()
export class MumbleBotService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(MumbleBotService.name);
  private client?: Client;

  constructor(
    private readonly environment: Environment,
    private readonly configurationService: ConfigurationService,
    private readonly events: Events,
    private readonly certificatesService: CertificatesService,
    private readonly gamesService: GamesService,
    private readonly gameRuntimeService: GameRuntimeService,
  ) {}

  async onModuleInit() {
    this.events.gameCreated.subscribe(
      async ({ game }) => await this.createChannels(game),
    );

    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) =>
            oldGame.isInProgress() && !newGame.isInProgress(),
        ),
      )
      .subscribe(async ({ newGame }) => await this.linkChannels(newGame));

    this.events.configurationEntryChanged
      .pipe(
        filter(
          ({ entryKey }) => entryKey === ConfigurationEntryKey.voiceServer,
        ),
      )
      .subscribe(async () => await this.tryConnect());

    await this.tryConnect();
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async tryConnect() {
    this.client?.disconnect();

    const voiceServerConfig = await this.configurationService.getVoiceServer();
    if (voiceServerConfig.type === SelectedVoiceServer.mumble) {
      try {
        const certificate = await this.certificatesService.getCertificate(
          'mumble',
        );

        this.client = new Client({
          host: voiceServerConfig.mumble.url,
          port: voiceServerConfig.mumble.port,
          username: this.environment.botName,
          password: voiceServerConfig.mumble.password,
          clientName: `tf2pickup.org ${version}`,
          key: certificate.clientKey,
          cert: certificate.certificate,
          rejectUnauthorized: false,
        });
        await this.client.connect();
        this.logger.log(`logged in as ${this.client.user.name}`);

        await this.moveToProperChannel();

        const permissions = await this.client.user.channel.getPermissions();
        if (!permissions.canCreateChannel) {
          this.logger.warn(
            `Bot ${this.client.user.name} does not have permissions to create new channels`,
          );
        }

        await this.client.user.setSelfDeaf(true);
      } catch (error) {
        this.logger.error(
          `cannot connect to ${voiceServerConfig.mumble.url}:${voiceServerConfig.mumble.port}: ${error}`,
        );
      }
    } else {
      await this.client?.disconnect();
    }
  }

  async createChannels(game: Game) {
    if (!this.client) {
      return;
    }

    try {
      const channelName = `${game.number}`;
      const channel = await this.client.user.channel.createSubChannel(
        channelName,
      );
      await channel.createSubChannel('BLU');
      await channel.createSubChannel('RED');
      this.logger.log(`channels for game #${game.number} created`);
    } catch (error) {
      this.logger.error(
        `cannot create channels for game #${game.number}: ${error}`,
      );
    }
  }

  async linkChannels(game: Game) {
    if (!this.client) {
      return;
    }

    try {
      const channelName = `${game.number}`;
      const gameChannel = this.client.user.channel.subChannels.find(
        (channel) => channel.name === channelName,
      );
      if (!gameChannel) {
        throw new Error('channel does not exist');
      }

      const [red, blu] = [
        gameChannel.subChannels.find(
          (channel) => channel.name.toUpperCase() === 'RED',
        ),
        gameChannel.subChannels.find(
          (channel) => channel.name.toUpperCase() === 'BLU',
        ),
      ];
      if (red && blu) {
        await red.link(blu);
        await this.gameRuntimeService.sayChat(
          game.gameServer,
          'Mumble channels linked',
        );
        this.logger.log(`channels for game #${game.number} linked`);
      } else {
        throw new Error('BLU or RED subchannel does not exist');
      }
    } catch (error) {
      this.logger.error(
        `cannot link channels for game #${game.number}: ${error}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async removeOldChannels() {
    if (!this.client?.user?.channel) {
      return;
    }

    /**
     * For each channel lookup the assigned game and see whether it has ended.
     * For ended games, make sure there are no players in the corresponding voice channel and then remove it.
     */
    await Promise.all(
      this.client.user.channel.subChannels.map(async (channel) => {
        try {
          const gameNumber = parseInt(channel.name, 10);
          if (isNaN(gameNumber)) {
            return;
          }

          const game = await this.gamesService.getByNumber(gameNumber);
          if (game.isInProgress()) {
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
          this.logger.log(`channel ${channel.name} removed`);
        } catch (error) {
          this.logger.error(`cannot remove channel ${channel.name}: ${error}`);
        }
      }),
    );
  }

  private async moveToProperChannel() {
    const voiceServerConfig = await this.configurationService.getVoiceServer();
    if (voiceServerConfig.type != SelectedVoiceServer.mumble) {
      throw new Error('selected voice server is not mumble');
    }

    const channel = this.client.channels.byName(
      voiceServerConfig.mumble.channelName,
    );
    await this.client.user.moveToChannel(channel.id);
  }
}
