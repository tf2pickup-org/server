import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Throws BadRequestException if the provided value is not a valid ObjectId.
 *
 * @export
 * @class ObjectIdValidationPipe
 * @implements {PipeTransform}
 */
@Injectable()
export class ObjectIdValidationPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('The provided id is invalid');
    }

    return value;
  }
}
