import { useAuthStore } from '../stores/authStore';
import { translate, translateApiError } from '../lib/i18n';
import { useLanguageStore } from '../stores/languageStore';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

/** Lỗi API đã được chuẩn hóa: có message thân thiện, status HTTP và data đi kèm. */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrapper fetch duy nhất của app.
 * - Tự gắn JWT, tự parse format chuẩn { status, message, data } và trả về `data`.
 * - Lỗi mạng / lỗi server đều được ném dưới dạng ApiError để UI xử lý thống nhất.
 * - 401 trên API nhân viên -> tự đăng xuất.
 */
async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
  const language = useLanguageStore.getState().language;
  const t = (key) => translate(language, key);
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (auth) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(t('apiConnectionError'), 0, null);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* body không phải JSON */
  }

  if (!res.ok || json?.status === 'error') {
    if (res.status === 401 && auth) useAuthStore.getState().logout();
    throw new ApiError(
      translateApiError(language, json?.message, res.status),
      res.status,
      json?.data ?? null,
    );
  }
  return json?.data ?? null;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
