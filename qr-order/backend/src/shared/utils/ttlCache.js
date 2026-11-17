/**
 * Cache bộ nhớ có TTL, dùng cho dữ liệu đọc nhiều - ghi ít (vd: thực đơn).
 * Với 50 khách cùng quét QR, thực đơn chỉ chạm DB tối đa 1 lần / TTL.
 *
 * Lưu ý: cache nằm trong 1 process. Nếu chạy nhiều instance, thay bằng Redis
 * (cùng interface get/set/del) và dùng Redis adapter cho Socket.io.
 */
export class TtlCache {
  /** @param {number} ttlMs */
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  del(key) {
    this.store.delete(key);
  }
}
