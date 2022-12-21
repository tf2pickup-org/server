import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { parse } from 'date-fns';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    try {
      return parse(value, 'yyyy-MM-dd', new Date());
    } catch (error) {
      throw new BadRequestException('invalid date');
    }
  }
}
