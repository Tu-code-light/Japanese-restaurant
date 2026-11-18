import { z } from 'zod';

export const createTableDto = z.object({
  name: z.string().trim().min(1, 'Tên bàn không được trống').max(100),
  capacity: z.coerce.number().int().positive().max(1000).default(2),
  location: z.string().trim().min(1).max(255).optional(),
  area: z.string().trim().min(1).max(255).optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).default('available'),
});

export const updateTableDto = z
  .object({
    name: z.string().trim().min(1).max(100),
    capacity: z.coerce.number().int().positive().max(1000),
    location: z.string().trim().min(1).max(255),
    area: z.string().trim().min(1).max(255),
    status: z.enum(['available', 'occupied', 'reserved', 'maintenance']),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export const updateTableStatusDto = z.object({
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']),
});

export const listTablesQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  location: z.string().trim().max(255).optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).optional(),
});

export const tableIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});
