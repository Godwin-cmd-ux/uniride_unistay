import { z } from 'zod';

export const fileUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(600)
  .refine((value) => /^https?:\/\//i.test(value) || value.startsWith('/uploads/'), {
    message: 'Invalid file URL',
  });
