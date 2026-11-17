import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import StaffLayout from './components/StaffLayout';
import { useTranslation } from './lib/i18n';

// Code-splitting: điện thoại khách chỉ tải trang gọi món, không tải code khu nhân viên.
const CustomerOrderPage = lazy(() => import('./pages/CustomerOrderPage'));
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage'));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage'));
const AdminTablesPage = lazy(() => import('./pages/AdminTablesPage'));
const MenuManagePage = lazy(() => import('./pages/MenuManagePage'));
const LanguageSelectPage = lazy(() => import('./pages/LanguageSelectPage'));

export default function App() {
  const { language, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'QR Order · Japanese Restaurant' : 'QR Order · Nhà hàng Nhật';
  }, [language]);

  return (
    <Suspense fallback={<div className="center-page"><p className="muted">{t('loading')}</p></div>}>
      <Routes>
        <Route path="/" element={<LanguageSelectPage />} />
        {/* Khách: quét QR -> /t/<token> */}
        <Route path="/t/:token" element={<CustomerOrderPage />} />

        {/* Nhân viên */}
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<StaffDashboardPage />} />
          <Route path="tables" element={<AdminTablesPage />} />
          <Route path="menu" element={<MenuManagePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
