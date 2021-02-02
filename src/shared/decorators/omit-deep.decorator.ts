import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { OmitDeepInterceptor } from '../interceptors/omit-deep.interceptor';

export const OmitDeep = (...props: string[]) => applyDecorators(
  SetMetadata('omit-deep', props),
  UseInterceptors(OmitDeepInterceptor),
);
