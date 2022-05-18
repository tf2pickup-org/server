import { Environment } from '@/environment/environment';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from '@tf2pickup-org/simple-mumble-bot';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { concatMap, distinctUntilChanged, filter, groupBy } from 'rxjs';
import { CertificatesService } from '@/certificates/services/certificates.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { GameRuntimeService } from '@/games/services/game-runtime.service';

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
        groupBy(({ game }) => game.id),
        concatMap((group) =>
          group.pipe(
            distinctUntilChanged((x, y) => x.game.state === y.game.state),
            filter(({ game }) => !game.isInProgress()),
          ),
        ),
      )
      .subscribe(async ({ game }) => await this.joinChannels(game));

    await this.connect();
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async connect() {
    const voiceServerConfig = await this.configurationService.getVoiceServer();
    if (voiceServerConfig.mumble) {
      const certificate = await this.certificatesService.getCertificate(
        'mumble',
      );

      this.client = new Client({
        host: voiceServerConfig.mumble.url,
        port: voiceServerConfig.mumble.port,
        username: this.environment.botName,
        key: certificate.clientKey,
        cert: certificate.certificate,
        rejectUnauthorized: false,
      });
      await this.client.connect();
      const channel = this.client.channels.byName(
        voiceServerConfig.mumble.channelName,
      );
      await this.client.user.moveToChannel(channel.id);

      const permissions = await this.client.user.channel.getPermissions();
      if (!permissions.canCreateChannel) {
        this.logger.warn(
          `Bot ${this.client.user.name} does not have permissions to create new channels`,
        );
      }
    }
  }

  async createChannels(game: Game) {
    if (!this.client) {
      return;
    }
    const channelName = `${game.number}`;
    const channel = await this.client.user.channel.createSubChannel(
      channelName,
    );
    await channel.createSubChannel('BLU');
    await channel.createSubChannel('RED');
    this.logger.log(`channels for game #${game.number} created`);
  }

  async joinChannels(game: Game) {
    if (!this.client) {
      return;
    }

    const channelName = `${game.number}`;
    const gameChannel = this.client.user.channel.subChannels.find(
      (channel) => channel.name === channelName,
    );
    if (gameChannel) {
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
      }
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async removeOldChannels() {
    /**
     * For each channel lookup the assigned game and see whether it has ended.
     * For ended games, make sure there are no players in the corresponding voice channel and then remove it.
     */
    for (const channel of this.client.user.channel.subChannels) {
      const gameNumber = parseInt(channel.name, 10);
      if (isNaN(gameNumber)) {
        continue;
      }

      const game = await this.gamesService.getByNumber(gameNumber);
      if (game.isInProgress()) {
        continue;
      }

      const userCount =
        channel.subChannels
          .map((c) => c.users.length)
          .reduce((prev, curr) => prev + curr, 0) + channel.users.length;

      if (userCount > 0) {
        continue;
      }

      await channel.remove();
      this.logger.log(`channel ${channel.name} removed`);
    }
  }
}
