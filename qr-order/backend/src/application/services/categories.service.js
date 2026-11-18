import { AppError } from '../errors/AppError.js';

export function createCategoriesService({ categoriesRepository, onMenuChanged }) {
  const mapConflict = (error, name) => {
    if (error.code === '23505') {
      throw AppError.conflict(`Danh mục "${name}" đã tồn tại`);
    }
    throw error;
  };

  return {
    list(storeId, filters) {
      return categoriesRepository.listByStore(storeId, filters);
    },

    async get(storeId, id) {
      const category = await categoriesRepository.findById(storeId, id);
      if (!category) throw AppError.notFound('Không tìm thấy danh mục');
      return category;
    },

    async create(storeId, dto) {
      try {
        const category = await categoriesRepository.create(storeId, dto);
        onMenuChanged(storeId);
        return category;
      } catch (error) {
        mapConflict(error, dto.name);
      }
    },

    async update(storeId, id, dto) {
      try {
        const category = await categoriesRepository.update(storeId, id, dto);
        if (!category) throw AppError.notFound('Không tìm thấy danh mục');
        onMenuChanged(storeId);
        return category;
      } catch (error) {
        if (error instanceof AppError) throw error;
        mapConflict(error, dto.name ?? 'đã chọn');
      }
    },

    async remove(storeId, id) {
      const category = await categoriesRepository.findById(storeId, id);
      if (!category) throw AppError.notFound('Không tìm thấy danh mục');

      const productCount = await categoriesRepository.countProducts(storeId, id);
      if (productCount > 0) {
        throw AppError.conflict('Không thể xóa danh mục đang có món ăn. Hãy chuyển hoặc xóa các món trước.');
      }

      await categoriesRepository.softDelete(storeId, id);
      onMenuChanged(storeId);
    },
  };
}
