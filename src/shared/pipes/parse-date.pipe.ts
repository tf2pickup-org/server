import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { parse, isValid } from 'date-fns';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const date = parse(value, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) {
      throw new BadRequestException(
        `invalid date format (${value}), expected yyyy-MM-dd`,
      );
    }
    return date;
  }
}
