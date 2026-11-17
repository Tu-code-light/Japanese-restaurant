import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/http';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../lib/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function StaffLoginPage() {
  const token = useAuthStore((s) => s.token);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/staff" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await api.post('/auth/login', form);
      useAuthStore.getState().setSession(session);
      navigate('/staff', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-page">
      <form className="card login" onSubmit={onSubmit}>
        <div className="row row--between">
          <span className="login__eyebrow">和食 · お食事処</span>
          <LanguageSwitcher />
        </div>
        <h1>{t('loginTitle')}</h1>
        <p className="muted">{t('loginWelcome')}</p>
        <input
          className="input"
          placeholder={t('username')}
          aria-label={t('username')}
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="input"
          type="password"
          placeholder={t('password')}
          aria-label={t('password')}
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={loading}>{loading ? t('loggingIn') : t('login')}</button>
      </form>
    </div>
  );
}
