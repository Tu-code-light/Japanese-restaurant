import { AppError } from '../errors/AppError.js';
import { logger } from '../../shared/utils/logger.js';

export function createProductsService({
  productsRepository,
  categoriesRepository,
  saveImage,
  deleteImage,
  onMenuChanged,
}) {
  const ensureCategory = async (storeId, categoryId) => {
    const category = await categoriesRepository.findById(storeId, categoryId);
    if (!category || !category.status) {
      throw AppError.badRequest('Danh mục không tồn tại hoặc đang bị ẩn');
    }
  };

  const removeImageSafely = async (imageUrl) => {
    try {
      await deleteImage(imageUrl);
    } catch (error) {
      logger.error('Không thể xóa ảnh món ăn cũ', error);
    }
  };

  return {
    list(storeId, filters) {
      return productsRepository.listByStore(storeId, filters);
    },

    async get(storeId, id) {
      const product = await productsRepository.findById(storeId, id);
      if (!product) throw AppError.notFound('Không tìm thấy món ăn');
      return product;
    },

    async create(storeId, dto, file) {
      await ensureCategory(storeId, dto.categoryId);
      const imageUrl = file ? await saveImage(file) : dto.imageUrl ?? null;
      try {
        const product = await productsRepository.create(storeId, { ...dto, imageUrl });
        onMenuChanged(storeId);
        return product;
      } catch (error) {
        if (imageUrl && file) await removeImageSafely(imageUrl);
        if (error.code === '23503') throw AppError.badRequest('Danh mục không tồn tại');
        throw error;
      }
    },

    async update(storeId, id, dto, file) {
      const existing = await this.get(storeId, id);
      if (dto.categoryId !== undefined) await ensureCategory(storeId, dto.categoryId);

      const imageUrl = file ? await saveImage(file) : dto.imageUrl;
      const nextImageUrl = imageUrl === undefined ? existing.imageUrl : imageUrl;
      let product;
      try {
        product = await productsRepository.update(storeId, id, {
          ...dto,
          ...(imageUrl !== undefined ? { imageUrl } : {}),
        });
      } catch (error) {
        if (file && imageUrl) await removeImageSafely(imageUrl);
        if (error.code === '23503') throw AppError.badRequest('Danh mục không tồn tại');
        throw error;
      }
      if (!product) {
        if (file && imageUrl) await removeImageSafely(imageUrl);
        throw AppError.notFound('Không tìm thấy món ăn');
      }
      if (existing.imageUrl && nextImageUrl !== existing.imageUrl) {
        await removeImageSafely(existing.imageUrl);
      }
      onMenuChanged(storeId);
      return product;
    },

    async updateStatus(storeId, id, status) {
      const product = await productsRepository.updateStatus(storeId, id, status);
      if (!product) throw AppError.notFound('Không tìm thấy món ăn');
      onMenuChanged(storeId);
      return product;
    },

    async remove(storeId, id) {
      const removed = await productsRepository.softDelete(storeId, id);
      if (!removed) throw AppError.notFound('Không tìm thấy món ăn');
      onMenuChanged(storeId);
    },
  };
}
