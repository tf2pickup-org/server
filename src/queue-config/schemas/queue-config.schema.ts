import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { z } from 'zod';

export const queueConfigSchema = z.object({
  teamCount: z.literal(2),
  classes: z.array(
    z.object({
      name: z.nativeEnum(Tf2ClassName),
      count: z.number().gte(1),
      canMakeFriendsWith: z.array(z.nativeEnum(Tf2ClassName)).optional(),
    }),
  ),
});
