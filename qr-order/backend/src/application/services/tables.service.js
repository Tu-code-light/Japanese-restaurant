import { AppError } from '../errors/AppError.js';

export function createTablesService({
  tablesRepository,
  tableByTokenCache,
  generateQrToken,
  generateQrDataUrl,
  customerAppUrl,
}) {
  const buildOrderUrl = (token) => `${customerAppUrl.replace(/\/$/, '')}/t/${token}`;

  return {
    async list(storeId) {
      const tables = await tablesRepository.listByStore(storeId);
      return tables.map((table) => ({ ...table, orderUrl: buildOrderUrl(table.qrToken) }));
    },

    async create(storeId, { name, area }) {
      // 24 byte ngẫu nhiên -> 48 ký tự hex: không đoán/liệt kê được (khác với id tăng dần).
      const qrToken = generateQrToken();
      try {
        const table = await tablesRepository.create({ storeId, name, area, qrToken });
        return { ...table, orderUrl: buildOrderUrl(table.qrToken) };
      } catch (err) {
        if (err.code === '23505') throw AppError.conflict(`Bàn "${name}" đã tồn tại`);
        throw err;
      }
    },

    /** Sinh ảnh QR (data URL PNG) cho 1 bàn */
    async getQr(storeId, tableId) {
      const table = await tablesRepository.findById(tableId, storeId);
      if (!table) throw AppError.notFound('Không tìm thấy bàn');

      const url = buildOrderUrl(table.qrToken);
      const dataUrl = await generateQrDataUrl(url);
      return { tableId: table.id, name: table.name, url, dataUrl };
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
