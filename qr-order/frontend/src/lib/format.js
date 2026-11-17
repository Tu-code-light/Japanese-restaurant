export const formatVND = (n, language = 'vi') =>
  `${Number(n).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}${language === 'en' ? ' VND' : 'đ'}`;

export const formatTime = (iso, language = 'vi') =>
  new Date(iso).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

export const statusLabel = (status, t) => {
  const keys = {
    pending: 'statusPending',
    confirmed: 'statusConfirmed',
    preparing: 'statusPreparing',
    served: 'statusServed',
    paid: 'statusPaid',
    cancelled: 'statusCancelled',
  };
  return keys[status] ? t(keys[status]) : status;
};

/** Hành động nhân viên có thể làm ở từng trạng thái */
export const getStaffActions = (t) => ({
  pending: [
    { to: 'confirmed', label: t('actionAccept'), primary: true },
    { to: 'cancelled', label: t('actionCancel'), danger: true },
  ],
  confirmed: [
    { to: 'preparing', label: t('actionStartPreparing'), primary: true },
    { to: 'cancelled', label: t('actionCancel'), danger: true },
  ],
  preparing: [{ to: 'served', label: t('actionServed'), primary: true }],
  served: [],
});

/** Phát tiếng "ting" ngắn khi có đơn mới (WebAudio, không cần file âm thanh) */
export function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    /* trình duyệt chặn autoplay - bỏ qua */
  }
}
