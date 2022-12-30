import { app } from '@/app';
import { PlayersService } from '@/players/services/players.service';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { GameDto } from '../dto/game.dto';
import { GameEvent, gameEventSchema, GameEventType } from './game-event';
import { GameServer, gameServerSchema } from './game-server';
import { GameSlot, gameSlotSchema } from './game-slot';
import { GameState } from './game-state';
import { SlotStatus } from './slot-status';

@Schema()
export class Game extends Serializable<GameDto> {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id?: Types.ObjectId;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id: string;

  @Prop({
    type: [gameEventSchema],
    required: true,
    default: () => [
      {
        at: new Date(),
        event: GameEventType.Created,
      },
    ],
    _id: false,
  })
  events: GameEvent[];

  get launchedAt() {
    return this.events.find((e) => e.event === GameEventType.Created).at;
  }

  get endedAt(): Date | undefined {
    const events = this.events.find((e) => e.event === GameEventType.Ended);
    return events?.at ?? undefined;
  }

  get lastConfiguredAt(): Date | undefined {
    return this.events
      .filter((e) => e.event === GameEventType.GameServerInitialized)
      .sort((a, b) => b.at.getTime() - a.at.getTime())[0]?.at;
  }

  @Prop({ required: true, unique: true })
  number!: number;

  @Type(() => GameSlot)
  @Prop({ type: [gameSlotSchema], required: true })
  slots!: GameSlot[];

  @Exclude({ toPlainOnly: true })
  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  assignedSkills?: Map<string, number>;

  @Prop({ required: true })
  map!: string;

  @Prop({ index: true, enum: GameState, default: GameState.launching })
  state?: GameState;

  @Exclude({ toPlainOnly: true })
  @Prop()
  connectString?: string;

  @Prop({ default: 0 })
  connectInfoVersion: number;

  @Prop()
  stvConnectString?: string;

  @Prop()
  logsUrl?: string;

  @Prop()
  demoUrl?: string;

  @Prop()
  error?: string;

  @Type(() => GameServer)
  @Prop({ type: gameServerSchema, _id: false })
  gameServer?: GameServer;

  @Type(() => Number)
  @Prop(
    raw({
      type: Map,
      of: Number,
    }),
  )
  score?: Map<string, number>;

  @Exclude({ toPlainOnly: true })
  @Prop({ unique: true, sparse: true })
  logSecret?: string;

  async serialize(): Promise<GameDto> {
    const playersService = app.get(PlayersService);

    return {
      id: this.id,
      launchedAt: this.launchedAt,
      endedAt: this.endedAt,
      number: this.number,
      slots: await Promise.all(
        this.slots.map(async (slot) => ({
          player: await playersService.getById(slot.player),
          team: slot.team,
          gameClass: slot.gameClass,
          status: slot.status,
          connectionStatus: slot.connectionStatus,
        })),
      ),
      map: this.map,
      state: this.state,
      connectInfoVersion: this.connectInfoVersion,
      stvConnectString: this.stvConnectString,
      logsUrl: this.logsUrl,
      demoUrl: this.demoUrl,
      error: this.error,
      gameServer: this.gameServer ? { name: this.gameServer.name } : undefined,
      score: {
        blu: this.score?.get('blu'),
        red: this.score?.get('red'),
      },
    };
  }

  findPlayerSlot(playerId: string): GameSlot {
    return this.slots.find((s) => s.player.toString() === playerId);
  }

  activeSlots(): GameSlot[] {
    return this.slots.filter((slot) =>
      [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(
        slot.status,
      ),
    );
  }

  isInProgress(): boolean {
    return [GameState.launching, GameState.started].includes(this.state);
  }
}

export type GameDocument = Game & Document;
export const gameSchema = SchemaFactory.createForClass(Game);
