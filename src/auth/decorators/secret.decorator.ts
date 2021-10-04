import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecretPurpose } from '../secret-purpose';

export function Secret(purpose: SecretPurpose) {
  return applyDecorators(UseGuards(AuthGuard(purpose)));
}
