import { assertIsError } from '@/utils/assert-is-error';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import SteamID from 'steamid';

@Injectable()
export class SteamIdValidationPipe implements PipeTransform {
  // skipcq: JS-0105
  transform(value: string) {
    try {
      const sid = new SteamID(value);
      if (sid.isValidIndividual()) {
        return sid.getSteamID64();
      } else {
        throw new BadRequestException('The provided SteamID is invalid');
      }
    } catch (error) {
      assertIsError(error);
      throw new BadRequestException(error.message);
    }
  }
}
