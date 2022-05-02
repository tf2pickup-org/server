import { ExposeObjectId } from '@/shared/decorators/expose-object-id';
import { Exclude } from 'class-transformer';
import { Types } from 'mongoose';

export abstract class MongooseDocument {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @ExposeObjectId()
  _id?: Types.ObjectId;
}
