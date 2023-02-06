import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Throws BadRequestException if the provided value is not a valid ObjectId.
 *
 * @export
 * @class ObjectIdValidationPipe
 * @implements {PipeTransform}
 */
@Injectable()
export class ObjectIdValidationPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`The provided ID (${value}) is invalid`);
    }

    return new Types.ObjectId(value);
  }
}
