import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTablesService } from '../src/application/services/tables.service.js';

const table = {
  id: 5,
  storeId: 2,
  name: 'Bàn 5',
  area: 'Tầng 1',
  location: 'Tầng 1',
  capacity: 4,
  status: 'available',
  qrToken: 'old-token',
  qrCode: 'old-qr',
};

function createService(overrides = {}) {
  const calls = [];
  let tokenNumber = 0;
  const tablesRepository = {
    findById: async () => table,
    findByToken: async () => table,
    listByStore: async () => ({ items: [], pagination: {} }),
    create: async (value) => ({ ...table, ...value }),
    update: async (_storeId, _id, value) => ({ ...table, ...value }),
    updateStatus: async (_storeId, _id, status) => ({ ...table, status }),
    updateQr: async (_storeId, _id, qrToken, qrCode) => ({ ...table, qrToken, qrCode }),
    softDeleteIfNoOpenOrders: async () => ({ qrToken: 'old-token', openOrders: 0 }),
    ...overrides,
  };
  const tableByTokenCache = {
    get: () => undefined,
    set: () => {},
    del: (token) => calls.push(['del', token]),
  };
  const service = createTablesService({
    tablesRepository,
    tableByTokenCache,
    withTransaction: async (work) => work({}),
    generateQrToken: () => `new-token-${++tokenNumber}`,
    generateQrDataUrl: async (url) => `png:${url}`,
    customerAppUrl: 'http://localhost:5173/',
  });
  return { service, calls };
}

test('table creation generates a secure-token URL and stores a QR image', async () => {
  const { service } = createService();
  const created = await service.create(2, {
    name: 'Bàn mới',
    capacity: 4,
    location: 'Tầng 2',
    status: 'available',
  });
  assert.equal(created.orderUrl, 'http://localhost:5173/t/new-token-1');
  assert.equal(created.capacity, 4);
});

test('QR regeneration replaces the token and invalidates the old token cache', async () => {
  const { service, calls } = createService();
  const regenerated = await service.regenerateQr(2, 5);
  assert.equal(regenerated.qrToken, 'new-token-1');
  assert.equal(regenerated.url, 'http://localhost:5173/t/new-token-1');
  assert.deepEqual(calls, [['del', 'old-token']]);
});

test('table deletion is blocked while open orders exist', async () => {
  const service = createService({
    softDeleteIfNoOpenOrders: async () => ({ qrToken: 'old-token', openOrders: 1 }),
  }).service;
  await assert.rejects(service.remove(2, 5), (error) => error.type === 'conflict');
});
