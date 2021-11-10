import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { ObjectIdValidationPipe } from './object-id-validation.pipe';
import { SteamIdPipe } from './steam-id.pipe';

/**
 * Throws BadRequestException if the provided value is not a valid ObjectId OR SteamId.
 *
 * @export
 * @class SteamOrObjectIdPipe
 * @implements {PipeTransform}
 */
@Injectable()
export class SteamOrObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    try {
      if (
        new SteamIdPipe().transform(value) ||
        new ObjectIdValidationPipe().transform(value)
      ) {
        return value;
      }
      throw new BadRequestException('value is not a valid user steamid');
    } catch {
      throw new BadRequestException('value is not a valid user steamid');
    }
  }
}
