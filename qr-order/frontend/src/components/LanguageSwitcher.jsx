import { useTranslation } from '../lib/i18n';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <label className={`language-switcher ${className}`.trim()}>
      <span className="sr-only">{t('language')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('language')}>
        <option value="vi">🇻🇳 Tiếng Việt</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </label>
  );
}
