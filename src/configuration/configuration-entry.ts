import { z, ZodTypeAny } from 'zod';

export interface ConfigurationEntry<SchemaType extends ZodTypeAny> {
  key: string;
  schema: SchemaType;
  default: z.infer<SchemaType>;
  description?: string;
}

export const configurationEntry = <S extends ZodTypeAny>(
  key: string,
  schema: S,
  defaultValue: z.infer<S>,
  description?: string,
): ConfigurationEntry<S> => ({
  key,
  schema,
  default: defaultValue,
  description,
});
