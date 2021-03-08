import { mongoose } from '@typegoose/typegoose';
import { Exclude } from 'class-transformer';

export abstract class MongooseDocument {

  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  _id?: mongoose.Types.ObjectId;

}
