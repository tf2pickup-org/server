import { prop } from '@typegoose/typegoose';

export class RefreshToken {
  @prop({ required: true })
  value!: string;

  @prop({ default: () => new Date() })
  public createdAt?: Date;
}
