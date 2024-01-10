// TODO: Find a way to remove the eslint-disable comments
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Transform, TransformationType } from 'class-transformer';
import { Types } from 'mongoose';

export const TransformObjectId: () => PropertyDecorator =
  () => (target: object, propertyKey: string | symbol) => {
    Transform(({ type, obj }) => {
      switch (type) {
        case TransformationType.PLAIN_TO_CLASS:
          return new Types.ObjectId(obj[propertyKey]);

        case TransformationType.CLASS_TO_PLAIN:
          return obj[propertyKey].toString();

        case TransformationType.CLASS_TO_CLASS:
          return obj[propertyKey];

        default:
          return undefined;
      }
    })(target, propertyKey);
  };
