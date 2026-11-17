import { z } from 'zod';

export const createTableDto = z.object({
  name: z.string().trim().min(1, 'Tên bàn không được trống').max(50),
  area: z.string().trim().min(1).max(50).default('Tầng 1'),
});

export const tableIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});
