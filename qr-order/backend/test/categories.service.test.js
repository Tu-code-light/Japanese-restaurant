import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCategoriesService } from '../src/application/services/categories.service.js';

const sampleCategory = { id: 7, storeId: 3, name: 'Đồ uống', status: true };

function createService(overrides = {}) {
  const calls = [];
  const categoriesRepository = {
    listByStore: async (...args) => { calls.push(['listByStore', ...args]); return { items: [], pagination: {} }; },
    findById: async () => sampleCategory,
    create: async (_storeId, dto) => ({ ...sampleCategory, ...dto }),
    update: async (_storeId, id, dto) => ({ ...sampleCategory, id, ...dto }),
    countProducts: async () => 0,
    softDelete: async () => true,
    ...overrides,
  };
  const onMenuChanged = (storeId) => calls.push(['menuChanged', storeId]);
  return { service: createCategoriesService({ categoriesRepository, onMenuChanged }), calls };
}

test('category create propagates menu updates and maps unique-name conflicts', async () => {
  const { service, calls } = createService();
  const created = await service.create(3, { name: 'Món mới' });
  assert.equal(created.name, 'Món mới');
  assert.deepEqual(calls, [['menuChanged', 3]]);

  const conflicting = createService({
    create: async () => { throw { code: '23505' }; },
  }).service;
  await assert.rejects(conflicting.create(3, { name: 'Đồ uống' }), (error) => error.type === 'conflict');
});

test('category update returns not found for another or deleted category', async () => {
  const service = createService({ update: async () => null }).service;
  await assert.rejects(service.update(3, 99, { name: 'No category' }), (error) => error.type === 'not_found');
});

test('category deletion refuses linked products and soft-deletes empty categories', async () => {
  let deleted = false;
  const linkedService = createService({
    countProducts: async () => 2,
    softDelete: async () => { deleted = true; },
  }).service;
  await assert.rejects(linkedService.remove(3, 7), (error) => error.type === 'conflict');
  assert.equal(deleted, false);

  const { service, calls } = createService();
  await service.remove(3, 7);
  assert.deepEqual(calls, [['menuChanged', 3]]);
});
