import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Optional,
  PipeTransform,
} from '@nestjs/common';

/**
 * Based on ParseEnumPipe
 * https://github.com/nestjs/nest/blob/master/packages/common/pipes/parse-enum.pipe.ts
 */

export interface ParseEnumArrayPipeOptions {
  delimiter: string;
}

const defaultOptions: ParseEnumArrayPipeOptions = {
  delimiter: ',',
};

@Injectable()
export class ParseEnumArrayPipe<T extends Record<string, unknown>>
  implements PipeTransform<string, T[]>
{
  protected readonly options: ParseEnumArrayPipeOptions;

  constructor(
    protected readonly enumType: T,
    @Optional() options?: ParseEnumArrayPipeOptions,
  ) {
    this.options = { ...defaultOptions, ...(options ?? {}) };
  }

  transform(value: string, metadata: ArgumentMetadata): T[] {
    const validValues = Object.values(this.enumType);
    const values = value.split(this.options.delimiter);
    for (const v of values) {
      if (!validValues.includes(v)) {
        throw new BadRequestException(
          `${metadata.data} needs to be at least one of ${validValues.join(
            this.options.delimiter,
          )}`,
        );
      }
    }

    return values as unknown as T[];
  }
}
