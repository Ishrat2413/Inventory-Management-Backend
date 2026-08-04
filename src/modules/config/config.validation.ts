import { z } from 'zod';
import { validateBody } from '../../handlers/zod-error-handler';

const zodUpdateConfigSchema = z.record(z.string(), z.any()).refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one config key must be provided',
});

export type UpdateConfigInput = z.infer<typeof zodUpdateConfigSchema>;

export const validateUpdateConfig = validateBody(zodUpdateConfigSchema);
