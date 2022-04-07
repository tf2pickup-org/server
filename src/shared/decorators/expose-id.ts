import { Transform, TransformationType } from 'class-transformer';

export const ExposeId = () => (target: any, propertyKey: string) => {
  Transform(({ type, obj }) => {
    switch (type) {
      case TransformationType.PLAIN_TO_CLASS:
      case TransformationType.CLASS_TO_CLASS:
        return obj[propertyKey];

      case TransformationType.CLASS_TO_PLAIN:
        return obj[propertyKey].toString();
    }
  })(target, propertyKey);
};
