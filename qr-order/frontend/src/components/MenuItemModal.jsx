import { useState } from 'react';
import { useTranslation } from '../lib/i18n';

/**
 * [TASK-701] Modal Thêm mới hoặc Chỉnh sửa món ăn
 */
export function MenuItemModal({ item, categories, onSave, onClose }) {
  const { t } = useTranslation();
  const isEditing = Boolean(item);

  const [formData, setFormData] = useState({
    name: item?.name ?? '',
    categoryId: item?.categoryId ?? (categories[0]?.id || ''),
    price: item?.price ?? '',
    description: item?.description ?? '',
    imageUrl: item?.imageUrl ?? '',
    isAvailable: item?.isAvailable ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t('nameRequired') || 'Vui lòng nhập tên món ăn');
      return;
    }
    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError(t('invalidPrice') || 'Giá món không hợp lệ');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        categoryId: Number(formData.categoryId),
        name: formData.name.trim(),
        price: Math.round(priceNum),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim() || null,
        ...(isEditing ? { isAvailable: formData.isAvailable } : {}),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet menu-item-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? (t('editMenuItem') || 'Chỉnh sửa món ăn') : (t('addMenuItem') || 'Thêm món ăn mới')}</h2>
        
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="menu-form">
          <label className="form-group">
            <span className="form-label">{t('category') || 'Danh mục'}:</span>
            <select
              className="input"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">{t('dishName') || 'Tên món'}:</span>
            <input
              type="text"
              className="input"
              placeholder={t('dishNamePlaceholder') || 'vd: Sashimi Cá Hồi'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              maxLength={150}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t('priceVND') || 'Đơn giá (VNĐ)'}:</span>
            <input
              type="number"
              className="input"
              placeholder="vd: 89000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              min={0}
              step={1000}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t('description') || 'Mô tả món'}:</span>
            <textarea
              className="input"
              rows={2}
              placeholder={t('descPlaceholder') || 'Mô tả thành phần, khẩu vị...'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t('imageUrl') || 'Đường dẫn ảnh (URL)'}:</span>
            <input
              type="url"
              className="input"
              placeholder="https://example.com/dish.jpg"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
          </label>

          {isEditing && (
            <label className="row form-checkbox">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              />
              <span>{t('isAvailable') || 'Món đang có sẵn phục vụ (Đang bán)'}</span>
            </label>
          )}

          <div className="row row--between mt-4">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              {t('cancel') || 'Hủy'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (t('saving') || 'Đang lưu...') : (t('save') || 'Lưu món ăn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
