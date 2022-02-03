import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ObjectIdOrSteamId } from '../models/object-id-or-steam-id';
import { ObjectIdValidationPipe } from './object-id-validation.pipe';
import { SteamIdValidationPipe } from './steam-id-validation.pipe';

@Injectable()
export class ObjectIdOrSteamIdPipe
  implements PipeTransform<string, ObjectIdOrSteamId>
{
  private objectIdValidationPipe = new ObjectIdValidationPipe();
  private steamIdValidationPipe = new SteamIdValidationPipe();

  transform(value: string): ObjectIdOrSteamId {
    try {
      const objectId = this.objectIdValidationPipe.transform(value);
      return {
        type: 'object-id',
        objectId,
      };
      // eslint-disable-next-line no-empty
    } catch (error) {}

    try {
      const steamId64 = this.steamIdValidationPipe.transform(value);
      return {
        type: 'steam-id',
        steamId64,
      };
      // eslint-disable-next-line no-empty
    } catch (error) {}

    throw new BadRequestException('The provided ID is invalid');
  }
}
