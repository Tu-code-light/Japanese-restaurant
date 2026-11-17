import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/http';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../lib/i18n';

/** Quản lý bàn + sinh/in mã QR cho từng bàn */
export default function AdminTablesPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [qr, setQr] = useState(null); // { name, url, dataUrl }
  const [form, setForm] = useState(() => ({ name: '', area: t('defaultArea') }));
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setTables(await api.get('/tables', { auth: true }));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setForm((current) => (
      current.area === 'Tầng 1' || current.area === 'Floor 1'
        ? { ...current, area: t('defaultArea') }
        : current
    ));
  }, [t]);

  const showQr = async (id) => {
    try {
      setQr(await api.get(`/tables/${id}/qr`, { auth: true }));
    } catch (e) {
      setError(e.message);
    }
  };

  const createTable = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/tables', form, { auth: true });
      setForm((current) => ({ ...current, name: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>{t('manageTables')}</h1>
      {error && <p className="error">{error}</p>}

      {isAdmin && (
        <form className="row card" onSubmit={createTable}>
          <input className="input" placeholder={t('tableNamePlaceholder')} aria-label={t('tableNamePlaceholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder={t('areaPlaceholder')} aria-label={t('areaPlaceholder')} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <button className="btn btn-primary" disabled={!form.name.trim()}>{t('addTable')}</button>
        </form>
      )}

      <div className="grid">
        {tables.map((table) => (
          <div className="card" key={table.id}>
            <strong>{table.name}</strong>
            <p className="muted">{table.area} · {t('openOrders', { count: table.openOrders })}</p>
            <button className="btn" onClick={() => showQr(table.id)}>{t('viewPrintQr')}</button>
          </div>
        ))}
        {tables.length === 0 && <p className="muted">{t('noTables')}</p>}
      </div>

      {qr && (
        <div className="sheet-backdrop" onClick={() => setQr(null)}>
          <div className="sheet qr-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{qr.name}</h2>
            <img src={qr.dataUrl} alt={`QR ${qr.name}`} width={300} height={300} />
            <p className="muted break">{qr.url}</p>
            <div className="row">
              <button className="btn" onClick={() => setQr(null)}>{t('close')}</button>
              <button className="btn btn-primary" onClick={() => window.print()}>{t('print')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
