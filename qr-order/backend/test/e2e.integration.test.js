import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { io as createClient } from 'socket.io-client';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} [${method} ${path}]: ${json.message || JSON.stringify(json)}`);
  }
  return json.data ?? json;
}

function connectSocket(auth, label) {
  const socket = createClient(BASE_URL, {
    auth,
    autoConnect: false,
    reconnection: false,
    timeout: 3000,
    transports: ['websocket'],
  });

  const connected = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`Timeout kết nối Socket (${label})`));
    }, 3500);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      socket.close();
      reject(new Error(`Lỗi kết nối Socket (${label}): ${err.message}`));
    });
  });

  socket.connect();
  return { socket, connected };
}

function waitForOrderEvent(socket, eventName, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout (${timeoutMs}ms) chờ sự kiện "${eventName}"`));
    }, timeoutMs);

    function handler(payload) {
      if (predicate(payload)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(payload);
      }
    }
    socket.on(eventName, handler);
  });
}

test('Kiểm thử: Khách quét QR -> Gọi món -> Bếp nhận real-time -> Đổi trạng thái -> Khách nhận thông báo', async (t) => {
  // 0. Kiểm tra server đang chạy
  const healthRes = await fetch(`${BASE_URL}/api/health`).catch(() => null);
  assert.ok(healthRes && healthRes.ok, `Backend chưa chạy tại ${BASE_URL}. Hãy chạy "npm run dev" trước!`);

  // 1. Nhân viên / Bếp đăng nhập & lấy thông tin bàn test
  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { username: 'staff', password: 'staff123' },
  });
  const staffToken = loginRes.token || loginRes.accessToken;
  assert.ok(staffToken, 'Đăng nhập staff phải trả về JWT token');

  const tablesRes = await apiRequest('/api/tables', { token: staffToken });
  const tables = Array.isArray(tablesRes) ? tablesRes : tablesRes.items || tablesRes.tables || [];
  assert.ok(tables.length > 0, 'DB phải có dữ liệu bàn (chạy npm run db:init trước)');
  const targetTable = tables[0];
  const tableToken = targetTable.qrToken || targetTable.qr_token;
  assert.ok(tableToken, 'Bàn test phải có qrToken');

  // 2. Mở kết nối Socket.IO song song cho Bếp (staff) và Khách hàng (customer)
  const staffConn = connectSocket({ token: staffToken }, 'Staff/Kitchen');
  const customerConn = connectSocket({ tableToken }, 'Customer');
  t.after(() => {
    staffConn.socket.disconnect();
    customerConn.socket.disconnect();
  });

  const [staffSocket, customerSocket] = await Promise.all([staffConn.connected, customerConn.connected]);
  assert.equal(staffSocket.connected, true);
  assert.equal(customerSocket.connected, true);

  // 3. Khách quét QR tải thực đơn (TASK-501)
  const menuRes = await apiRequest(`/api/public/tables/${tableToken}`);
  assert.equal(String(menuRes.table.id), String(targetTable.id));
  const availableItems = menuRes.menu.flatMap((c) => c.items.filter((i) => i.isAvailable !== false));
  assert.ok(availableItems.length >= 2, 'Thực đơn phải có ít nhất 2 món đang bán');

  // 4. Khách gửi đơn đặt món (TASK-503) -> Bếp nhận sự kiện 'order:new' & 'notification' real-time
  const kitchenNewOrderPromise = waitForOrderEvent(
    staffSocket,
    'order:new',
    (order) => String(order.tableId) === String(targetTable.id),
  );
  const kitchenNotifyPromise = once(staffSocket, 'notification');

  const createdOrder = await apiRequest('/api/public/orders', {
    method: 'POST',
    body: {
      tableToken,
      idempotencyKey: crypto.randomUUID(),
      note: 'E2E Test TASK-801',
      items: [
        { menuItemId: availableItems[0].id, quantity: 2 },
        { menuItemId: availableItems[1].id, quantity: 1 },
      ],
    },
  });

  assert.equal(createdOrder.status, 'pending');
  const receivedOrder = await kitchenNewOrderPromise;
  const [notifyPayload] = await kitchenNotifyPromise;
  assert.equal(receivedOrder.id, createdOrder.id, 'Bếp phải nhận đúng đơn khách vừa đặt qua Socket');
  assert.equal(notifyPayload.type, 'order:new');
  assert.equal(notifyPayload.orderId, createdOrder.id);

  // 5. Bếp đổi trạng thái tuần tự -> Khách nhận thông báo real-time (TASK-403 -> TASK-505)
  for (const nextStatus of ['confirmed', 'preparing', 'served']) {
    const customerStatusPromise = waitForOrderEvent(
      customerSocket,
      'order_status_updated',
      (order) => order.id === createdOrder.id && order.status === nextStatus,
    );

    await apiRequest(`/api/orders/${createdOrder.id}/status`, {
      method: 'PATCH',
      token: staffToken,
      body: { status: nextStatus },
    });

    const updatedOrder = await customerStatusPromise;
    assert.equal(updatedOrder.status, nextStatus, `Khách phải nhận được trạng thái mới "${nextStatus}"`);
  }

  // 6. Dọn dẹp: Thanh toán đóng đơn để giữ sạch database
  await apiRequest(`/api/orders/tables/${targetTable.id}/checkout`, {
    method: 'POST',
    token: staffToken,
  });
});