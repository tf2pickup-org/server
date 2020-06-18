import { prop, Ref, index } from '@typegoose/typegoose';
import { GamePlayer } from './game-player';
import { GameServer } from '@/game-servers/models/game-server';
import { ObjectId } from 'mongodb';

type GameState = 'launching' | 'started' | 'ended' | 'interrupted';

@index({ state: 1 })
export class Game {
  id: string;

  @prop({ default: () => new Date() })
  launchedAt?: Date;

  @prop({ required: true, unique: true })
  number!: number;

  @prop({ items: GamePlayer, required: true })
  slots!: GamePlayer[];

  @prop({ of: Number })
  assignedSkills?: Map<string, number>;

  @prop({ required: true })
  map!: string;

  @prop({ default: 'launching' })
  state?: GameState;

  @prop()
  connectString?: string;

  @prop()
  mumbleUrl?: string;

  @prop()
  logsUrl?: string;

  @prop()
  error?: string;

  @prop({ ref: () => GameServer })
  gameServer?: Ref<GameServer>;

  @prop({ of: Number })
  score?: Map<string, number>;

  @prop()
  stvConnectString?: string;

  findPlayerSlot(playerId: string | ObjectId) {
    const _playerId = new ObjectId(playerId);
    return this.slots.find(s => _playerId.equals(s.player as ObjectId));
  }

}
