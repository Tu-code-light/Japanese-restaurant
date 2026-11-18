import { AppError } from '../errors/AppError.js';

/**
 * Thực đơn công khai được cache 30s: 50 khách quét QR cùng lúc chỉ tốn ~1 query.
 * Khi quản lý sửa menu thì xóa cache ngay + bắn socket để các bàn tải lại.
 */
export function createMenuService({ menuRepository, publicMenuCache, publisher }) {
  const invalidate = (storeId) => {
    publicMenuCache.del(storeId);
    publisher.menuChanged(storeId);
  };

  return {
    /** Menu cho khách: chỉ món đang bán */
    async getPublicMenu(storeId) {
      const cached = publicMenuCache.get(storeId);
      if (cached) return cached;

      const menu = await menuRepository.listCategoriesWithItems(storeId, true);
      publicMenuCache.set(storeId, menu);
      return menu;
    },

    /** Menu cho quản lý: gồm cả món tạm hết */
    getAdminMenu(storeId) {
      return menuRepository.listCategoriesWithItems(storeId, false);
    },

    async createItem(storeId, dto) {
      const item = await menuRepository.create(storeId, dto);
      invalidate(storeId);
      return item;
    },

    async updateItem(storeId, id, dto) {
      const item = await menuRepository.update(storeId, id, dto);
      if (!item) throw AppError.notFound('Không tìm thấy món');
      invalidate(storeId);
      return item;
    },

    async deleteItem(storeId, id) {
      const result = await menuRepository.delete(storeId, id);
      invalidate(storeId);
      return result;
    },
  };
}
