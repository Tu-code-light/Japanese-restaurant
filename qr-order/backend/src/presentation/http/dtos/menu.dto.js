import { z } from 'zod';

export const createMenuItemDto = z.object({
  categoryId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, 'Tên món không được trống').max(150),
  description: z.string().trim().max(1000).default(''),
  price: z.coerce.number().int().min(0, 'Giá không được âm').max(100_000_000),
  imageUrl: z.string().url().max(500).nullable().optional(),
});

// PATCH: mọi field đều tùy chọn nhưng phải có ít nhất 1 field.
export const updateMenuItemDto = z
  .object({
    categoryId: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(1000),
    price: z.coerce.number().int().min(0).max(100_000_000),
    imageUrl: z.string().url().max(500).nullable(),
    isAvailable: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Cần ít nhất một trường để cập nhật' });

export const menuItemIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});
