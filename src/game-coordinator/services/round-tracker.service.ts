import { Events } from '@/events/events';
import { GameId } from '@/games/game-id';
import { GameEventType } from '@/games/models/game-event-type';
import { Tf2Team } from '@/games/models/tf2-team';
import { GamesService } from '@/games/services/games.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isUndefined } from 'lodash';
import { Types } from 'mongoose';
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
  private readonly data = new Map<string, RoundData>();

  constructor(
    private readonly events: Events,
    private readonly gamesService: GamesService,
  ) {}

  onModuleInit() {
    this.events.roundWin.subscribe(({ gameId, winner }) => {
      const round = this.data.get(gameId.toString()) ?? {};
      this.data.set(gameId.toString(), { ...round, winner });
    });

    this.events.roundLength.subscribe(({ gameId, lengthMs }) => {
      const round = this.data.get(gameId.toString()) ?? {};
      this.data.set(gameId.toString(), { ...round, lengthMs });
    });

    this.events.scoreReported.subscribe(({ gameId, teamName, score }) => {
      const round = this.data.get(gameId.toString()) ?? {};
      round.score = { ...round.score, [teamName]: score };
      this.data.set(gameId.toString(), round);
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
        await this.gamesService.update(new Types.ObjectId(key) as GameId, {
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
