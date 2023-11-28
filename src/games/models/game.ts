import { PlayerId } from '@/players/types/player-id';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { GameDto } from '../dto/game.dto';
import { GameId } from '../game-id';
import { GameEvent, gameEventSchema } from './game-event';
import { GameServer, gameServerSchema } from './game-server';
import { GameSlot, gameSlotSchema } from './game-slot';
import { GameState } from './game-state';
import { SlotStatus } from './slot-status';
import { GameEventType } from './game-event-type';
import { GameCreated, gameCreatedSchema } from './events/game-created';
import { GameStarted, gameStartedSchema } from './events/game-started';
import { GameEnded, gameEndedSchema } from './events/game-ended';
import {
  GameServerInitialized,
  gameServerInitializedSchema,
} from './events/game-server-initialized';
import {
  SubstituteRequested,
  substituteRequestedSchema,
} from './events/substitute-requested';
import { PlayerReplaced, playerReplacedSchema } from './events/player-replaced';
import {
  PlayerJoinedGameServer,
  playerJoinedGameServerSchema,
} from './events/player-joined-game-server';
import { PlayerJoinedGameServerTeam } from './events/player-joined-game-server-team';
import {
  PlayerLeftGameServer,
  playerLeftGameServerSchema,
} from './events/player-left-game-server';
import {
  GameServerAssigned,
  gameServerAssignedSchema,
} from './events/game-server-assigned';
import { RoundEnded, roundEndedSchema } from './events/round-ended';

@Schema()
export class Game extends Serializable<GameDto> {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id!: GameId;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id!: string;

  @Type(() => GameEvent, {
    discriminator: {
      property: 'event',
      subTypes: [
        {
          value: GameCreated,
          name: GameEventType.gameCreated,
        },
        {
          value: GameStarted,
          name: GameEventType.gameStarted,
        },
        {
          value: GameEnded,
          name: GameEventType.gameEnded,
        },
        {
          value: GameServerAssigned,
          name: GameEventType.gameServerAssigned,
        },
        {
          value: GameServerInitialized,
          name: GameEventType.gameServerInitialized,
        },
        {
          value: SubstituteRequested,
          name: GameEventType.substituteRequested,
        },
        {
          value: PlayerReplaced,
          name: GameEventType.playerReplaced,
        },
        {
          value: PlayerJoinedGameServer,
          name: GameEventType.playerJoinedGameServer,
        },
        {
          value: PlayerJoinedGameServerTeam,
          name: GameEventType.playerJoinedGameServerTeam,
        },
        {
          value: PlayerLeftGameServer,
          name: GameEventType.playerLeftGameServer,
        },
        {
          value: RoundEnded,
          name: GameEventType.roundEnded,
        },
      ],
    },
  })
  @Prop({
    type: [gameEventSchema],
    required: true,
    default: () => [
      {
        at: new Date(),
        event: GameEventType.gameCreated,
      },
    ],
    _id: false,
  })
  events!: (
    | GameCreated
    | GameStarted
    | GameEnded
    | GameServerAssigned
    | GameServerInitialized
    | SubstituteRequested
    | PlayerReplaced
    | PlayerJoinedGameServer
    | PlayerJoinedGameServerTeam
    | PlayerLeftGameServer
    | RoundEnded
  )[];

  get launchedAt() {
    const firstEvent = this.events.find(
      (e) => e.event === GameEventType.gameCreated,
    );

    if (!firstEvent) {
      throw Error(`game #${this.number} has no creation event`);
    }

    return firstEvent.at;
  }

  get endedAt(): Date | undefined {
    const events = this.events.find((e) => e.event === GameEventType.gameEnded);
    return events?.at ?? undefined;
  }

  get lastConfiguredAt(): Date | undefined {
    return this.events
      .filter((e) => e.event === GameEventType.gameServerInitialized)
      .sort((a, b) => b.at.getTime() - a.at.getTime())[0]?.at;
  }

  getMostRecentEvent(type: GameEventType): GameEvent | undefined {
    return this.events
      .filter((e) => e.event === type)
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .at(0);
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

  @Prop({ index: true, enum: GameState, default: GameState.created })
  state!: GameState;

  @Exclude({ toPlainOnly: true })
  @Prop()
  connectString?: string;

  @Prop({ default: 0 })
  connectInfoVersion!: number;

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

  serialize(): GameDto {
    return {
      id: this.id,
      launchedAt: this.launchedAt.toISOString(),
      ...(this.endedAt && { endedAt: this.endedAt.toISOString() }),
      number: this.number,
      slots: this.slots,
      map: this.map,
      state: this.state,
      connectInfoVersion: this.connectInfoVersion,
      stvConnectString: this.stvConnectString,
      logsUrl: this.logsUrl,
      demoUrl: this.demoUrl,
      error: this.error,
      gameServer: this.gameServer ? { name: this.gameServer.name } : undefined,
      ...(this.score && {
        score: {
          blu: this.score.get('blu'),
          red: this.score.get('red'),
        },
      }),
    };
  }

  findPlayerSlot(
    playerId: PlayerId,
    acceptedSlotStatus: SlotStatus[] = [
      SlotStatus.active,
      SlotStatus.waitingForSubstitute,
    ],
  ): GameSlot | undefined {
    return this.slots
      .filter((s) => acceptedSlotStatus.includes(s.status))
      .find((s) => s.player.equals(playerId));
  }

  activeSlots(): GameSlot[] {
    return this.slots.filter((slot) =>
      [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(
        slot.status,
      ),
    );
  }

  // Return true if the game is considered to be in progress.
  isInProgress(): boolean {
    return [
      GameState.created,
      GameState.configuring,
      GameState.launching,
      GameState.started,
    ].includes(this.state);
  }
}

export type GameDocument = Game & Document;
export const gameSchema = SchemaFactory.createForClass(Game);

const events = gameSchema.path<MongooseSchema.Types.Subdocument>('events');
events.discriminator(GameEventType.gameCreated, gameCreatedSchema);
events.discriminator(GameEventType.gameStarted, gameStartedSchema);
events.discriminator(GameEventType.gameEnded, gameEndedSchema);
events.discriminator(
  GameEventType.gameServerAssigned,
  gameServerAssignedSchema,
);
events.discriminator(
  GameEventType.gameServerInitialized,
  gameServerInitializedSchema,
);
events.discriminator(
  GameEventType.substituteRequested,
  substituteRequestedSchema,
);
events.discriminator(GameEventType.playerReplaced, playerReplacedSchema);
events.discriminator(
  GameEventType.playerJoinedGameServer,
  playerJoinedGameServerSchema,
);
events.discriminator(
  GameEventType.playerJoinedGameServerTeam,
  playerJoinedGameServerSchema,
);
events.discriminator(
  GameEventType.playerLeftGameServer,
  playerLeftGameServerSchema,
);
events.discriminator(GameEventType.roundEnded, roundEndedSchema);
