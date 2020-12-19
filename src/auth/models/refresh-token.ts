import { prop, index } from '@typegoose/typegoose';

@index({ value: 'hashed' })
export class RefreshToken {

  @prop({ required: true })
  value!: string;

  @prop({ default: () => new Date() })
  public createdAt?: Date;

}
