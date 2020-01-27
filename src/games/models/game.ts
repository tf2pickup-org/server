import { prop, mapProp, arrayProp, Ref } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';
import { GamePlayer } from './game-player';
import { GameServer } from '@/game-servers/models/game-server';

type GameState = 'launching' | 'started' | 'ended' | 'interrupted';

export class Game {
  @prop({ default: () => new Date() })
  launchedAt?: Date;

  @prop({ required: true, unique: true })
  number!: number;

  @mapProp({ of: String })
  teams?: Map<string, string>;

  @arrayProp({ ref: 'Player' })
  players?: Array<Ref<Player>>;

  @arrayProp({ items: GamePlayer })
  slots?: GamePlayer[];

  @mapProp({ of: Number })
  assignedSkills?: Map<string, number>;

  @prop({ required: true })
  map!: string;

  @prop({ required: true, default: 'launching' })
  state!: GameState;

  @prop()
  connectString?: string;

  @prop()
  mumbleUrl?: string;

  @prop()
  logsUrl?: string;

  @prop()
  error?: string;

  @prop({ ref: 'GameServer' })
  gameServer?: Ref<GameServer>;

  @mapProp({ of: Number })
  score?: Map<string, number>;

  @prop()
  stvConnectString?: string;
}
