import { z } from 'zod';

const categoryFields = {
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(150),
  description: z.string().trim().max(1000).default(''),
  imageUrl: z.string().url().max(500).nullable().optional(),
  status: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
};

export const createCategoryDto = z.object(categoryFields);

export const updateCategoryDto = z
  .object({
    name: categoryFields.name,
    description: categoryFields.description,
    imageUrl: categoryFields.imageUrl,
    status: categoryFields.status,
    sortOrder: categoryFields.sortOrder,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export const categoryIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCategoriesQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
});
