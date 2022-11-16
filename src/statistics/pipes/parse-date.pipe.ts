import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const date = Date.parse(value);
    if (isNaN(date)) {
      throw new BadRequestException('invalid date');
    }
    return new Date(date);
  }
}
