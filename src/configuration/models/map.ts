import { prop } from '@typegoose/typegoose';

export class Map {

  @prop({ required: true, unique: true })
  name!: string;

  @prop()
  configName?: string;

}
