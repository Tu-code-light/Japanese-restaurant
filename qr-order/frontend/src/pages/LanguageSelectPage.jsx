import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';

export default function LanguageSelectPage() {
  const navigate = useNavigate();
  const { setLanguage, t } = useTranslation();

  const chooseLanguage = (language) => {
    setLanguage(language);
    navigate('/staff', { replace: true });
  };

  return (
    <main className="language-page">
      <section className="language-panel" aria-labelledby="language-title">
        <span className="language-mark" aria-hidden="true">和</span>
        <p className="eyebrow">{t('welcomeEyebrow')}</p>
        <h1 id="language-title">{t('welcomeTitle')}</h1>
        <p className="language-description">{t('welcomeDescription')}</p>
        <h2>{t('chooseLanguage')}</h2>
        <p className="muted">{t('chooseLanguageHint')}</p>
        <div className="language-options">
          <button className="language-option" onClick={() => chooseLanguage('vi')}>
            <span className="language-option__flag" aria-hidden="true">🇻🇳</span>
            <span className="language-option__copy">
              <strong>Tiếng Việt</strong>
              <small>Vietnamese</small>
            </span>
            <span className="language-option__arrow" aria-hidden="true">→</span>
          </button>
          <button className="language-option" onClick={() => chooseLanguage('en')}>
            <span className="language-option__flag" aria-hidden="true">🇬🇧</span>
            <span className="language-option__copy">
              <strong>English</strong>
              <small>Tiếng Anh</small>
            </span>
            <span className="language-option__arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <p className="language-footer">QR ORDER <span>·</span> Japanese dining</p>
      </section>
    </main>
  );
}
