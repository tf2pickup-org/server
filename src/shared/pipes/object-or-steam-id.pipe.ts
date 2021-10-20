import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as SteamID from 'steamid';

/**
 * Throws BadRequestException if the provided value is not a valid ObjectId OR SteamId.
 *
 * @export
 * @class ObjectOrSteamIdPipe
 * @implements {PipeTransform}
 */
@Injectable()
export class ObjectOrSteamIdPipe implements PipeTransform {
  transform(value: string) {
    try {
      if (Types.ObjectId.isValid(value) || new SteamID(value).isValid()) {
        return value;
      }
    } catch {
      // don't care about error
      // needed because "new SteamID" throws a general "Error", but we want a "BadRequestException"
      throw new BadRequestException('value is not a valid objectid or steamid');
    }
  }
}
