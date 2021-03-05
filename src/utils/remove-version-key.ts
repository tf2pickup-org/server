import { Exclude } from 'class-transformer';

/**
 * Utility class to get rid of the mongoose's version key from models.
 */
export class RemoveVersionKey {

  @Exclude()
  __v?: number;

}
