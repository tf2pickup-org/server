import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseSortParamsPipe implements PipeTransform {
  // skipcq: JS-0105
  transform(value: string): Record<string, 1 | -1> {
    switch (value) {
      case '-launched_at':
      case '-launchedAt':
        return { 'events.0.at': -1 };

      case 'launched_at':
      case 'launchedAt':
        return { 'events.0.at': 1 };

      default:
        throw new BadRequestException('invalid sort parameters');
    }
  }
}
