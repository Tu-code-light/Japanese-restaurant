import { AppError } from '../errors/AppError.js';

export function createTablesService({
  tablesRepository,
  tableByTokenCache,
  withTransaction,
  generateQrToken,
  generateQrDataUrl,
  customerAppUrl,
}) {
  const buildOrderUrl = (token) => `${customerAppUrl.replace(/\/$/, '')}/t/${token}`;
  const buildOrderUrlWithOrigin = (token, origin) => {
    if (typeof origin === 'string' && /^https?:\/\//i.test(origin)) {
      try {
        const hostname = new URL(origin).hostname;
        if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
          return `${origin.replace(/\/$/, '')}/t/${token}`;
        }
      } catch {
        // Fall back to CUSTOMER_APP_URL when the supplied origin is invalid.
      }
    }
    return buildOrderUrl(token);
  };
  const withOrderUrl = (table) => ({
    ...table,
    orderUrl: buildOrderUrl(table.qrToken),
  });

  return {
    lockForOrder(db, storeId, tableId) {
      return tablesRepository.lockForOrder(db, storeId, tableId);
    },

    async list(storeId, filters) {
      const result = await tablesRepository.listByStore(storeId, filters);
      return { ...result, items: result.items.map(withOrderUrl) };
    },

    async get(storeId, tableId) {
      const table = await tablesRepository.findById(tableId, storeId);
      if (!table) throw AppError.notFound('Không tìm thấy bàn');
      const { qrCode, ...details } = table;
      return withOrderUrl(details);
    },

    async create(storeId, { name, area, location, capacity, status }) {
      // 24 byte ngẫu nhiên -> 48 ký tự hex: không đoán/liệt kê được (khác với id tăng dần).
      const qrToken = generateQrToken();
      const url = buildOrderUrl(qrToken);
      const qrCode = await generateQrDataUrl(url);
      try {
        const table = await tablesRepository.create({
          storeId,
          name,
          area: location ?? area ?? 'Tầng 1',
          capacity,
          status,
          qrToken,
          qrCode,
        });
        return withOrderUrl(table);
      } catch (err) {
        if (err.code === '23505') throw AppError.conflict(`Bàn "${name}" đã tồn tại`);
        throw err;
      }
    },

    async update(storeId, tableId, dto) {
      try {
        const table = await tablesRepository.update(storeId, tableId, dto);
        if (!table) throw AppError.notFound('Không tìm thấy bàn');
        if (dto.status === 'maintenance') tableByTokenCache.del(table.qrToken);
        return withOrderUrl(table);
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err.code === '23505') throw AppError.conflict(`Bàn "${dto.name ?? 'đã chọn'}" đã tồn tại`);
        throw err;
      }
    },

    async updateStatus(storeId, tableId, status) {
      const existing = await tablesRepository.findById(tableId, storeId);
      if (!existing) throw AppError.notFound('Không tìm thấy bàn');
      const table = await tablesRepository.updateStatus(storeId, tableId, status);
      if (!table) throw AppError.notFound('Không tìm thấy bàn');
      tableByTokenCache.del(existing.qrToken);
      return withOrderUrl(table);
    },

    async remove(storeId, tableId) {
      const result = await withTransaction((db) =>
        tablesRepository.softDeleteIfNoOpenOrders(db, storeId, tableId));
      if (!result) throw AppError.notFound('Không tìm thấy bàn');
      if (result.openOrders > 0) {
        throw AppError.conflict('Không thể xóa bàn đang có đơn hàng chưa hoàn tất');
      }
      tableByTokenCache.del(result.qrToken);
    },

    /** Sinh ảnh QR (data URL PNG) cho 1 bàn */
    async getQr(storeId, tableId, origin) {
      const table = await tablesRepository.findById(tableId, storeId);
      if (!table) throw AppError.notFound('Không tìm thấy bàn');

        const url = buildOrderUrlWithOrigin(table.qrToken, origin);
        const dataUrl = await generateQrDataUrl(url);
        await tablesRepository.updateQr(storeId, tableId, table.qrToken, dataUrl);
      return { tableId: table.id, name: table.name, url, dataUrl };
    },

    async regenerateQr(storeId, tableId) {
      const table = await tablesRepository.findById(tableId, storeId);
      if (!table) throw AppError.notFound('Không tìm thấy bàn');

      const qrToken = generateQrToken();
      const url = buildOrderUrl(qrToken);
      const qrCode = await generateQrDataUrl(url);
      const updated = await tablesRepository.updateQr(storeId, tableId, qrToken, qrCode);
      if (!updated) throw AppError.notFound('Không tìm thấy bàn');
      tableByTokenCache.del(table.qrToken);
      return { ...withOrderUrl(updated), url, dataUrl: qrCode };
    },

    async verifyToken(token) {
      const table = await this.resolveByToken(token);
      return {
        id: table.id,
        name: table.name,
        location: table.location,
        status: table.status,
      };
    },

    /**
     * Dùng cho luồng khách: token -> bàn (hoặc 404).
     * Cache 60s vì hàm này chạy ở MỖI request/kết nối socket của khách; thông tin bàn gần như không đổi.
     * Chỉ cache kết quả tìm thấy (token sai không bị cache -> không phình bộ nhớ vì request rác).
     */
    async resolveByToken(token) {
      const cached = tableByTokenCache.get(token);
      if (cached) return cached;

      const table = await tablesRepository.findByToken(token);
      if (!table) throw AppError.notFound('Mã QR không hợp lệ hoặc bàn đã ngừng hoạt động');
      tableByTokenCache.set(token, table);
      return table;
    },
  };
}
