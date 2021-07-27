import { Exclude } from 'class-transformer';
import { Types } from 'mongoose';

export abstract class MongooseDocument {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  _id?: Types.ObjectId;
}
