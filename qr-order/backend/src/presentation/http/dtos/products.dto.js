import { z } from 'zod';

const productFields = {
  categoryId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, 'Tên món không được để trống').max(255),
  description: z.string().trim().max(1000).default(''),
  price: z.coerce.number().int().min(0).max(100_000_000),
  status: z.enum(['available', 'unavailable']).default('available'),
  imageUrl: z.string().url().max(500).nullable().optional(),
};

export const createProductDto = z.object(productFields);

export const updateProductDto = z
  .object({
    categoryId: productFields.categoryId,
    name: productFields.name,
    description: productFields.description,
    price: productFields.price,
    status: productFields.status,
    imageUrl: productFields.imageUrl,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export const updateProductStatusDto = z.object({
  status: z.enum(['available', 'unavailable']),
});

export const productIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});

export const listProductsQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(255).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    status: z.enum(['available', 'unavailable']).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sortBy: z.enum(['price', 'created_at']).default('created_at'),
    sort: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, {
    message: 'minPrice không được lớn hơn maxPrice',
    path: ['minPrice'],
  });
