import { z } from 'zod';

export interface ConfigurationEntry<
  T = unknown,
  V extends z.ZodType<T> = z.ZodTypeAny,
> {
  key: string;
  schema: V;
  default: T;
  description?: string;
}
