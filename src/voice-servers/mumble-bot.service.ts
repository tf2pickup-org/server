import { Environment } from '@/environment/environment';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { filter } from 'rxjs';
import { CertificatesService } from '@/certificates/services/certificates.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { GameRuntimeService } from '@/game-coordinator/services/game-runtime.service';
import { version } from '../../package.json';
import { MumbleBot } from './mumble-bot';
import { VoiceServerType } from '@/games/voice-server-type';

@Injectable()
export class MumbleBotService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(MumbleBotService.name);
  private bot?: MumbleBot;

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

    this.events.configurationChanged
      .pipe(
        filter(({ key }) =>
          [
            'games.voice_server_type',
            'games.voice_server.mumble.url',
            'games.voice_server.mumble.port',
            'games.voice_server.mumble.channel_name',
            'games.voice_server.mumble.password',
          ].includes(key),
        ),
      )
      .subscribe(async () => await this.tryConnect());

    await this.tryConnect();
  }

  onModuleDestroy() {
    this.bot?.disconnect();
  }

  async tryConnect() {
    this.bot?.disconnect();

    const voiceServerType =
      await this.configurationService.get<VoiceServerType>(
        'games.voice_server_type',
      );
    if (voiceServerType === VoiceServerType.mumble) {
      try {
        const [url, port, channelName, password] = await Promise.all([
          this.configurationService.get<string>(
            'games.voice_server.mumble.url',
          ),
          this.configurationService.get<number>(
            'games.voice_server.mumble.port',
          ),
          this.configurationService.get<string>(
            'games.voice_server.mumble.channel_name',
          ),
          this.configurationService.get<string>(
            'games.voice_server.mumble.password',
          ),
        ]);

        if (!url || !channelName) {
          throw Error('mumble configuration malformed');
        }

        const certificate = await this.certificatesService.getCertificate(
          'mumble',
        );

        this.bot = new MumbleBot({
          host: url,
          port: port,
          username: this.environment.botName,
          password,
          clientName: `tf2pickup.org ${version}`,
          certificate,
          targetChannelName: channelName,
        });
        await this.bot.connect();
      } catch (error) {
        this.logger.error(
          `cannot connect to ${this.bot?.options.host}:${this.bot?.options.port}: ${error}`,
        );
      }
    } else {
      this.bot?.disconnect();
    }
  }

  async createChannels(game: Game) {
    try {
      await this.bot?.setupChannels(game);
    } catch (error) {
      this.logger.error(
        `cannot create channels for game #${game.number}: ${error}`,
      );
    }
  }

  async linkChannels(game: Game) {
    try {
      await this.bot?.linkChannels(game);
      if (game.gameServer) {
        await this.gameRuntimeService.sayChat(
          game.gameServer,
          'Mumble channels linked',
        );
      }
    } catch (error) {
      this.logger.error(
        `cannot link channels for game #${game.number}: ${error}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async removeOldChannels() {
    const runningGames = await this.gamesService.getRunningGames();
    await this.bot?.removeObsoleteChannels(runningGames);
  }
}
