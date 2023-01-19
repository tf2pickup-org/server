import { z, ZodTypeAny } from 'zod';

export interface ConfigurationEntry<SchemaType extends ZodTypeAny> {
  key: string;
  schema: SchemaType;
  default: z.infer<SchemaType>;
  description?: string;
}

export const configurationEntry = <SchemaType extends ZodTypeAny>(
  key: string,
  schema: SchemaType,
  defaultValue: z.infer<SchemaType>,
  description?: string,
): ConfigurationEntry<SchemaType> => ({
  key,
  schema,
  default: defaultValue,
  description,
});
