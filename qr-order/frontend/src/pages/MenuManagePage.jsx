import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/http';
import { formatVND } from '../lib/format';
import { useTranslation } from '../lib/i18n';

/** Nhân viên bật/tắt "tạm hết món". Khách đang mở app sẽ tự cập nhật nhờ socket (menu:changed). */
export default function MenuManagePage() {
  const { language, t } = useTranslation();
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

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

  return (
    <>
      <h1>{t('menuManagement')}</h1>
      {error && <p className="error">{error}</p>}
      {menu.map((cat) => (
        <section key={cat.id} className="section">
          <h2>{cat.name}</h2>
          {cat.items.map((item) => (
            <div className="menu-card" key={item.id}>
              <div className="menu-card__info">
                <h3 style={{ opacity: item.isAvailable ? 1 : 0.5 }}>{item.name}</h3>
                <strong>{formatVND(item.price, language)}</strong>
              </div>
              <button className={`btn ${item.isAvailable ? '' : 'btn-danger'}`} disabled={pendingId === item.id} onClick={() => toggle(item)}>
                {item.isAvailable ? t('selling') : t('unavailable')}
              </button>
            </div>
          ))}
        </section>
      ))}
      {menu.length === 0 && <p className="muted">{t('noMenuItems')}</p>}
    </>
  );
}
