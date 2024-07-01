import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import moment = require('moment');

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const date = moment(value, 'YYYY-MM-DD', true);
    if (!date.isValid()) {
      throw new BadRequestException(
        `Invalid date format (${value}). Expected format: yyyy-MM-dd`,
      );
    }
    return date.toDate();
  }
}
