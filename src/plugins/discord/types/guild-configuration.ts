import { z } from 'zod';

export const guildConfigurationSchema = z.object({
  id: z.string(),
  substituteNotifications: z
    .object({
      channel: z.string(),
      role: z.string().optional(),
    })
    .optional(),
  queuePrompts: z
    .object({
      channel: z.string(),
      bumpPlayerThresholdRatio: z.number(),
    })
    .optional(),
  adminNotifications: z
    .object({
      channel: z.string(),
    })
    .optional(),
});

export type GuildConfiguration = z.infer<typeof guildConfigurationSchema>;
