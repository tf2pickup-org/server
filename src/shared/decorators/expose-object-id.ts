import { Transform, TransformationType } from 'class-transformer';
import { merge } from 'lodash';

interface ExposeObjectIdOptions {
  toClass?: boolean;
  toPlain?: boolean;
}

export const ExposeObjectId =
  (options?: ExposeObjectIdOptions) => (target: any, propertyKey: string) => {
    const mergedOptions = merge({ toClass: true, toPlain: true }, options);
    Transform(({ type, obj }) => {
      switch (type) {
        case TransformationType.PLAIN_TO_CLASS:
          if (mergedOptions.toClass) {
            return obj[propertyKey];
          } else {
            return undefined;
          }

        case TransformationType.CLASS_TO_PLAIN:
          if (mergedOptions.toPlain) {
            return obj[propertyKey].toString();
          } else {
            return undefined;
          }

        case TransformationType.CLASS_TO_CLASS:
          return obj[propertyKey];
      }
    })(target, propertyKey);
  };
