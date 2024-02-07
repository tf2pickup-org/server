import { z } from 'zod';
import { queueConfigSchema } from '../schemas/queue-config.schema';

export type QueueConfig = z.infer<typeof queueConfigSchema>;
