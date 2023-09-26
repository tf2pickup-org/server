import { z } from 'zod';

export const guildConfigurationSchema = z.object({
  id: z.string(),
  queueNotifications: z
    .object({
      channel: z.string().optional(),
      role: z.string().optional(),
    })
    .optional(),
  adminNotifications: z
    .object({
      channel: z.string().optional(),
    })
    .optional(),
});

export type GuildConfiguration = z.infer<typeof guildConfigurationSchema>;
