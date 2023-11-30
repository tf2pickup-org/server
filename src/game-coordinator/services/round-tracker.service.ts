import { Events } from '@/events/events';
import { GameId } from '@/games/game-id';
import { GameEventType } from '@/games/models/game-event-type';
import { Tf2Team } from '@/games/models/tf2-team';
import { GamesService } from '@/games/services/games.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isUndefined } from 'lodash';
import { debounceTime, merge } from 'rxjs';

interface RoundData {
  winner?: Tf2Team;
  lengthMs?: number;
  score?: {
    [Tf2Team.blu]?: number;
    [Tf2Team.red]?: number;
  };
}

@Injectable()
export class RoundTrackerService implements OnModuleInit {
  private readonly logger = new Logger(RoundTrackerService.name);
  private readonly data = new Map<GameId, RoundData>();

  constructor(
    private readonly events: Events,
    private readonly gamesService: GamesService,
  ) {}

  onModuleInit() {
    this.events.roundWin.subscribe(({ gameId, winner }) => {
      if (!this.data.has(gameId)) {
        this.data.set(gameId, {});
      }

      this.logger.verbose(`${gameId} round winner: ${winner}`);
      this.data.get(gameId)!.winner = winner;
    });

    this.events.roundLength.subscribe(({ gameId, lengthMs }) => {
      if (!this.data.has(gameId)) {
        this.data.set(gameId, {});
      }

      this.logger.verbose(`${gameId} round length: ${lengthMs} ms`);
      this.data.get(gameId)!.lengthMs = lengthMs;
    });

    this.events.scoreReported.subscribe(({ gameId, teamName, score }) => {
      if (!this.data.has(gameId)) {
        this.data.set(gameId, {});
      }

      this.logger.verbose(`${gameId} ${teamName} score: ${score}`);
      const data = this.data.get(gameId)!;
      const newScore = { ...data.score, [teamName]: score };
      data.score = newScore;
    });

    merge(
      this.events.roundWin,
      this.events.roundLength,
      this.events.scoreReported,
    )
      .pipe(debounceTime(1000))
      .subscribe(async () => {
        try {
          await this.maybeRoundEnded();
        } catch (error) {
          this.logger.error(error);
        }
      });
  }

  async maybeRoundEnded() {
    for (const [key, value] of this.data) {
      if (
        !isUndefined(value.lengthMs) &&
        value.winner &&
        !isUndefined(value.score?.blu) &&
        !isUndefined(value.score?.red)
      ) {
        this.logger.verbose(
          `round ended (winner: ${value.winner}, length: ${
            value.lengthMs
          } ms, score: BLU=${value.score!.blu};RED=${value.score!.red})`,
        );
        await this.gamesService.update(key, {
          $push: {
            events: {
              at: new Date(),
              event: GameEventType.roundEnded,
              winner: value.winner,
              lengthMs: value.lengthMs,
              score: value.score,
            },
          },
        });
        this.data.delete(key);
      }
    }
  }
}
