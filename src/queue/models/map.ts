import { prop } from '@typegoose/typegoose';

export class Map {

  @prop({ required: true, unique: true })
  name!: string;

  @prop()
  execConfig?: string;

  // when the cooldown is 0, we're good to use this map again
  @prop({ default: 0 })
  cooldown?: number;

}
