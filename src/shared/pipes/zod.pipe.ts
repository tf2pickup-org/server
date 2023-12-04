import { Injectable, PipeTransform } from '@nestjs/common';
import { ZodTypeAny } from 'zod';

@Injectable()
export class ZodPipe<T extends ZodTypeAny>
  implements PipeTransform<unknown, T>
{
  constructor(private readonly schema: T) {}

  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
