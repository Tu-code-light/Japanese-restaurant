/**
 * Load test: mô phỏng N khách (mặc định 50) quét QR và gửi order ĐỒNG THỜI,
 * trong khi 3 nhân viên kết nối socket để nhận đơn mới.
 *
 * Chạy (server phải đang chạy và DB đã seed):
 *   npm run test:load
 *   CONCURRENCY=100 API_URL=http://localhost:4000 npm run test:load
 *
 * Đo: tỉ lệ thành công, độ trễ API (p50/p95/max), số sự kiện socket nhân viên nhận được,
 *     độ trễ từ lúc gửi đơn đến lúc nhân viên nhận (end-to-end).
 */
import { io } from 'socket.io-client';
import crypto from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:4000';
const N = Number(process.env.CONCURRENCY ?? 50);

const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
};

const pct = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((arr.length * p) / 100))];

async function main() {
  // 1. Đăng nhập nhân viên + lấy danh sách bàn
  const login = await api('/auth/login', { method: 'POST', body: { username: 'staff', password: 'staff123' } });
  if (!login.ok) throw new Error(`Đăng nhập thất bại: ${login.json.message}`);
  const token = login.json.data.token;

  const tables = (await api('/tables', { token })).json.data;
  if (!tables.length) throw new Error('Chưa có bàn nào, hãy chạy npm run db:init');

  // 2. Nhân viên kết nối socket, ghi lại thời điểm nhận đơn
  const received = new Map(); // idempotencyKey (nằm trong note) -> thời điểm nhận
  const staffSockets = Array.from({ length: 3 }, () => {
    const s = io(API, { auth: { token }, transports: ['websocket'] });
    s.on('order:new', (o) => {
      if (!received.has(o.note)) received.set(o.note, performance.now());
    });
    return s;
  });
  await Promise.all(staffSockets.map((s) => new Promise((r) => s.on('connect', r))));

  // 3. N khách: mỗi người mở socket ở bàn của mình, tải menu rồi gửi order
  const sent = new Map();
  const latencies = [];
  let success = 0;
  let failed = 0;

  const customer = async (i) => {
    const table = tables[i % tables.length];
    const sock = io(API, { auth: { tableToken: table.qrToken }, transports: ['websocket'] });
    await new Promise((r) => sock.on('connect', r));

    const ctx = await api(`/public/tables/${table.qrToken}`);
    const items = ctx.json.data.menu.flatMap((c) => c.items);
    const pick = items[i % items.length];

    const tag = `load-${i}-${crypto.randomUUID()}`;
    const t0 = performance.now();
    sent.set(tag, t0);
    const res = await api('/public/orders', {
      method: 'POST',
      body: {
        tableToken: table.qrToken,
        idempotencyKey: crypto.randomUUID(),
        note: tag,
        items: [{ menuItemId: pick.id, quantity: 1 + (i % 3) }],
      },
    });
    latencies.push(performance.now() - t0);
    res.ok ? success++ : (failed++, console.log(`  ✖ #${i}: ${res.status} ${res.json.message}`));
    sock.close();
  };

  console.log(`▶ ${N} khách gửi order đồng thời tới ${API} ...`);
  const start = performance.now();
  await Promise.all(Array.from({ length: N }, (_, i) => customer(i)));
  const total = performance.now() - start;

  // Chờ socket giao nốt
  await new Promise((r) => setTimeout(r, 1000));

  const e2e = [...received].map(([tag, t]) => t - sent.get(tag)).filter((x) => x >= 0);
  console.log('\n===== KẾT QUẢ =====');
  console.log(`Thành công / Thất bại : ${success} / ${failed}`);
  console.log(`Tổng thời gian        : ${total.toFixed(0)} ms`);
  console.log(`Độ trễ API   p50/p95/max: ${pct(latencies, 50).toFixed(0)} / ${pct(latencies, 95).toFixed(0)} / ${Math.max(...latencies).toFixed(0)} ms`);
  console.log(`Nhân viên nhận đơn qua socket: ${received.size}/${success}`);
  if (e2e.length) {
    console.log(`Độ trễ end-to-end (gửi -> nhân viên thấy) p50/p95/max: ${pct(e2e, 50).toFixed(0)} / ${pct(e2e, 95).toFixed(0)} / ${Math.max(...e2e).toFixed(0)} ms`);
  }

  staffSockets.forEach((s) => s.close());
  process.exit(failed === 0 && received.size === success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Load test lỗi:', err);
  process.exit(1);
});
