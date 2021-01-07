import { prop } from '@typegoose/typegoose';
import { Map } from './map';

export class QueueConfiguration {

  @prop({ type: () => [Map], required: true })
  maps!: Map[];

}
