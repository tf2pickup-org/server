import { Exclude } from 'class-transformer';

/**
 * Utility class to get rid of the _id property and the version key.
 */
export class RemoveVersionKeyAndId {

  @Exclude()
  _id?: string;

  @Exclude()
  __v?: number;

}
