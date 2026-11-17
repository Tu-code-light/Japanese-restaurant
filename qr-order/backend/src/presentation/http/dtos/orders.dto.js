import { z } from 'zod';
import { ALL_STATUSES } from '../../../domain/orders/constants.js';

/** Khách gửi order (không tin giá từ client: chỉ nhận id món + số lượng) */
export const createOrderDto = z.object({
  tableToken: z.string().trim().min(16).max(64),
  idempotencyKey: z.string().trim().min(8, 'idempotencyKey quá ngắn').max(64),
  note: z.string().trim().max(500).default(''),
  items: z
    .array(
      z.object({
        menuItemId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1, 'Số lượng tối thiểu 1').max(99),
        note: z.string().trim().max(200).default(''),
      }),
    )
    .min(1, 'Đơn hàng phải có ít nhất 1 món')
    .max(50, 'Một đơn tối đa 50 dòng món'),
});

export const tokenParamDto = z.object({
  token: z.string().trim().min(16).max(64),
});

export const orderIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateStatusDto = z.object({
  status: z.enum(ALL_STATUSES),
});

export const listOrdersQueryDto = z.object({
  status: z.enum(ALL_STATUSES).optional(),
  // Mặc định chỉ lấy đơn đang mở; includeClosed=true để xem cả đơn đã thanh toán/hủy (giới hạn 200).
  includeClosed: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const checkoutParamDto = z.object({
  tableId: z.coerce.number().int().positive(),
});
