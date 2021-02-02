import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { UnderscoreIdToIdInterceptor } from '../interceptors/underscore-id-to-id.interceptor';
import { OmitDeep } from './omit-deep.decorator';

export const RenameUnderscoreIdToId = () =>
  applyDecorators(
    OmitDeep('_id', '__v'),
    UseInterceptors(UnderscoreIdToIdInterceptor),
  );
