import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/http';
import { formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';
import { useAuthStore } from '../stores/authStore';
import { MenuItemModal } from '../components/MenuItemModal';

/**
 * [TASK-701] Quản lý Thực đơn (CRUD): Thêm / Sửa / Xóa món ăn, bật/tắt tạm hết
 */
export default function MenuManagePage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { language, t } = useTranslation();
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  // Bộ lọc & tìm kiếm
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Quản lý modal thêm/sửa món
  const [modal, setModal] = useState({ isOpen: false, item: null });

  const load = useCallback(async () => {
    try {
      setMenu(await api.get('/menu', { auth: true }));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    return menu.map((cat) => ({ id: cat.id, name: cat.name }));
  }, [menu]);

  // Bật / tắt trạng thái còn món / tạm hết
  const toggle = async (item) => {
    setPendingId(item.id);
    setError(null);
    try {
      await api.patch(`/menu/items/${item.id}`, { isAvailable: !item.isAvailable }, { auth: true });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingId(null);
    }
  };

  // Thêm mới hoặc cập nhật món
  const handleSaveItem = async (data) => {
    setError(null);
    try {
      if (modal.item) {
        await api.patch(`/menu/items/${modal.item.id}`, data, { auth: true });
        setSuccessMsg(t('itemUpdated') || 'Đã cập nhật món ăn thành công');
      } else {
        await api.post('/menu/items', data, { auth: true });
        setSuccessMsg(t('itemCreated') || 'Đã thêm món ăn mới thành công');
      }
      setTimeout(() => setSuccessMsg(null), 3500);
      await load();
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  // Xóa món ăn
  const handleDeleteItem = async (item) => {
    if (!window.confirm(t('confirmDeleteItem', { name: item.name }) || `Bạn có chắc muốn xóa món "${item.name}"?`)) {
      return;
    }
    setPendingId(item.id);
    setError(null);
    try {
      await api.delete(`/menu/items/${item.id}`, { auth: true });
      setSuccessMsg(t('itemDeleted') || `Đã xóa món "${item.name}"`);
      setTimeout(() => setSuccessMsg(null), 3500);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingId(null);
    }
  };

  // Lọc món theo từ khóa và danh mục
  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu
      .filter((cat) => selectedCat === 'all' || String(cat.id) === String(selectedCat))
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => !q || it.name.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.items.length > 0 || !q);
  }, [menu, search, selectedCat]);

  return (
    <>
      <div className="row row--between mb-4">
        <div>
          <h1>{t('menuManagement') || 'Quản lý Thực đơn'}</h1>
          <p className="muted">{t('menuManageHint') || 'Thêm, sửa, xóa món ăn và điều chỉnh tình trạng phục vụ'}</p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => setModal({ isOpen: true, item: null })}
            disabled={categories.length === 0}
          >
            + {t('addMenuItem') || 'Thêm món mới'}
          </button>
        )}
      </div>

      {error && <p className="error mb-3">{error}</p>}
      {successMsg && <div className="toast toast--success mb-3">{successMsg}</div>}

      {/* Thanh tìm kiếm & Lọc danh mục */}
      <div className="card menu-filter-bar mb-4">
        <div className="row">
          <input
            type="text"
            className="input search-input"
            placeholder={t('searchDish') || 'Tìm kiếm tên món ăn...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input category-select"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="all">{t('allCategories') || 'Tất cả danh mục'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredMenu.map((cat) => (
        <section key={cat.id} className="section">
          <h2>{cat.name} ({cat.items.length})</h2>
          <div className="menu-grid">
            {cat.items.map((item) => (
              <div className="menu-card menu-card--admin" key={item.id}>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="menu-card__thumb"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}
                <div className="menu-card__info">
                  <h3 style={{ opacity: item.isAvailable ? 1 : 0.55 }}>
                    {item.name}
                  </h3>
                  {item.description && <p className="muted menu-card__desc">{item.description}</p>}
                  <strong>{formatVND(item.price, language)}</strong>
                </div>

                <div className="menu-card__actions row">
                  <button
                    className={`btn btn-sm ${item.isAvailable ? '' : 'btn-danger'}`}
                    disabled={pendingId === item.id}
                    onClick={() => toggle(item)}
                    title={item.isAvailable ? 'Chuyển sang Tạm hết' : 'Chuyển sang Đang bán'}
                  >
                    {item.isAvailable ? (t('selling') || 'Đang bán') : (t('unavailable') || 'Tạm hết')}
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        className="btn btn-sm"
                        disabled={pendingId === item.id}
                        onClick={() => setModal({ isOpen: true, item })}
                      >
                        ✏️ {t('edit') || 'Sửa'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={pendingId === item.id}
                        onClick={() => handleDeleteItem(item)}
                      >
                        🗑️ {t('delete') || 'Xóa'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {cat.items.length === 0 && <p className="muted">{t('noMatchingItems') || 'Không tìm thấy món phù hợp'}</p>}
        </section>
      ))}

      {menu.length === 0 && <p className="muted">{t('noMenuItems') || 'Chưa có món trong thực đơn.'}</p>}

      {/* Modal Thêm / Sửa món */}
      {modal.isOpen && (
        <MenuItemModal
          item={modal.item}
          categories={categories}
          onSave={handleSaveItem}
          onClose={() => setModal({ isOpen: false, item: null })}
        />
      )}
    </>
  );
}
