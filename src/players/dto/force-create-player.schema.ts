import { z } from 'zod';

export const forceCreatePlayerSchema = z.object({
  name: z.string(),
  steamId: z.string().regex(/^\d{17}$/),
});
