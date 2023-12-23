import { Types } from 'mongoose';
import { z } from 'zod';
import { PlayerId } from '../types/player-id';

export const addPlayerBanSchema = z.object({
  player: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), {
      message: 'player has to be a valid player id',
    })
    .transform((val) => new Types.ObjectId(val) as PlayerId),
  admin: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), {
      message: 'admin has to be a valid player id',
    })
    .transform((val) => new Types.ObjectId(val) as PlayerId),
  start: z
    .string()
    .datetime()
    .transform((val) => new Date(val)),
  end: z
    .string()
    .datetime()
    .transform((val) => new Date(val)),
  reason: z.string().optional(),
});
