import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import * as SteamID from 'steamid';

/**
 * Throws BadRequestException if the provided value is not a valid ObjectId OR SteamId.
 *
 * @export
 * @class ObjectOrSteamIdPipe
 * @implements {PipeTransform}
 */
@Injectable()
export class SteamIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    try {
      if (new SteamID(value).isValidIndividual()) {
        return value;
      }
      throw new BadRequestException('value is not a valid user steamid');
    } catch {
      throw new BadRequestException('value is not a valid user steamid');
    }
  }
}
