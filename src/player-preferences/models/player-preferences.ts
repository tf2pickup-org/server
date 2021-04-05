import { Player } from '@/players/models/player';
import { prop, Ref } from '@typegoose/typegoose';

export class PlayerPreferences {
  @prop({ ref: () => Player, unique: true })
  player?: Ref<Player>;

  @prop({ type: String })
  preferences: Map<string, string>;
}
