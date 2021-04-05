import { Exclude } from 'class-transformer';

/**
 * Utility class to get rid of the _id property.
 */
export class RemoveId {
  @Exclude()
  _id?: string;
}
