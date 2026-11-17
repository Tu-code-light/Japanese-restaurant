import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

/** Khung chung cho khu vực nhân viên: chặn truy cập khi chưa đăng nhập + thanh điều hướng */
export default function StaffLayout() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  if (!token) return <Navigate to="/staff/login" replace />;

  return (
    <div className="staff">
      <nav className="staff__nav">
        <div className="staff__brand">
          <span className="staff__brand-mark" aria-hidden="true">和</span>
          <span className="staff__brand-copy">
            <strong>QR Order</strong>
            <small>和食 · Japanese dining</small>
          </span>
        </div>
        <NavLink to="/staff" end>{t('staffOrders')}</NavLink>
        <NavLink to="/staff/tables">{t('tablesQr')}</NavLink>
        <NavLink to="/staff/menu">{t('menu')}</NavLink>
        <span className="spacer" />
        <span className="muted">{user?.name}</span>
        <LanguageSwitcher />
        <button className="btn" onClick={() => useAuthStore.getState().logout()}>{t('logout')}</button>
      </nav>
      <main className="staff__main">
        <Outlet />
      </main>
    </div>
  );
}
