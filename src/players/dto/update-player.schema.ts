import { z } from 'zod';
import { PlayerRole } from '../models/player-role';

export const updatePlayerSchema = z.object({
  name: z.string().optional(),
  avatar: z
    .object({
      small: z.string(),
      medium: z.string(),
      large: z.string(),
    })
    .optional(),
  roles: z.array(z.nativeEnum(PlayerRole)).optional(),
});
