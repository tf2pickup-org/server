import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { parse } from 'date-fns';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date | undefined> {
  // skipcq: JS-0105
  transform(value: string): Date | undefined {
    if (value === undefined) {
      return undefined;
    }
    try {
      return parse(value, 'yyyy-MM-dd', new Date());
    } catch (error) {
      throw new BadRequestException('invalid date');
    }
  }
}
