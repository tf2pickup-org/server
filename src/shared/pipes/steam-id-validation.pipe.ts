import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as SteamID from 'steamid';

@Injectable()
export class SteamIdValidationPipe implements PipeTransform {
  transform(value: string) {
    try {
      const sid = new SteamID(value);
      if (sid.isValidIndividual()) {
        return sid.getSteamID64();
      } else {
        throw new BadRequestException('The provided SteamID is invalid');
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
