import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GameEvent } from '../game-event';
import { GameEventType } from '../game-event-type';
import { GameEventDto } from '@/games/dto/game-event.dto';
import { Type } from 'class-transformer';
import { Tf2Team } from '../tf2-team';

@Schema()
class Score {
  @Prop({ required: true })
  [Tf2Team.blu]!: number;

  @Prop({ required: true })
  [Tf2Team.red]!: number;
}

const scoreSchema = SchemaFactory.createForClass(Score);

@Schema()
export class RoundEnded extends GameEvent {
  event = GameEventType.roundEnded;

  @Prop({ required: true })
  winner!: Tf2Team;

  @Prop({ required: true })
  lengthMs!: number;

  @Type(() => Score)
  @Prop({ type: scoreSchema, required: true })
  score!: Score;

  serialize(): GameEventDto {
    return {
      event: this.event,
      at: this.at.toISOString(),
      score: {
        blu: this.score.blu,
        red: this.score.red,
      },
    };
  }
}

export const roundEndedSchema = SchemaFactory.createForClass(RoundEnded);
