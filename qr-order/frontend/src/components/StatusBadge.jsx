import { memo } from 'react';
import { statusLabel } from '../lib/format';
import { useTranslation } from '../lib/i18n';

export const StatusBadge = memo(function StatusBadge({ status }) {
  const { t } = useTranslation();
  return <span className={`badge badge-${status}`}>{statusLabel(status, t)}</span>;
});
