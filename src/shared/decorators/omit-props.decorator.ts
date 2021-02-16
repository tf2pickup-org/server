import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { OmitPropsInterceptor } from '../interceptors/omit-props.interceptor';

export const OmitProps = (...props: string[]) => applyDecorators(
  SetMetadata('omit-props', props),
  UseInterceptors(OmitPropsInterceptor),
);
