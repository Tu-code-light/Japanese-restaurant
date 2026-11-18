import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProductsService } from '../src/application/services/products.service.js';

const category = { id: 2, status: true };
const product = { id: 8, storeId: 3, categoryId: 2, name: 'Trà', imageUrl: null };

function createService(overrides = {}) {
  const { categoriesRepository: categoriesRepositoryOverride, ...repositoryOverrides } = overrides;
  const calls = [];
  const productsRepository = {
    listByStore: async () => ({ items: [], pagination: {} }),
    findById: async () => product,
    create: async (_storeId, dto) => ({ ...product, ...dto }),
    update: async (_storeId, _id, dto) => ({ ...product, ...dto }),
    updateStatus: async (_storeId, _id, status) => ({ ...product, status }),
    softDelete: async () => true,
    ...repositoryOverrides,
  };
  const categoriesRepository = categoriesRepositoryOverride ?? { findById: async () => category };
  const service = createProductsService({
    productsRepository,
    categoriesRepository,
    saveImage: async () => '/uploads/products/new.png',
    deleteImage: async (imageUrl) => calls.push(['deleteImage', imageUrl]),
    onMenuChanged: (storeId) => calls.push(['menuChanged', storeId]),
  });
  return { service, calls };
}

test('product creation validates category and publishes menu changes', async () => {
  const { service, calls } = createService();
  const created = await service.create(3, { categoryId: 2, name: 'Trà' });
  assert.equal(created.name, 'Trà');
  assert.deepEqual(calls, [['menuChanged', 3]]);

  const invalidCategory = createService({
    categoriesRepository: { findById: async () => null },
  }).service;
  await assert.rejects(
    invalidCategory.create(3, { categoryId: 999, name: 'Trà' }),
    (error) => error.type === 'bad_request',
  );
});

test('product status and deletion update the menu cache', async () => {
  const { service, calls } = createService();
  await service.updateStatus(3, 8, 'unavailable');
  await service.remove(3, 8);
  assert.deepEqual(calls, [['menuChanged', 3], ['menuChanged', 3]]);
});

test('replacing a product image removes its previous local image', async () => {
  const { service, calls } = createService();
  await service.update(3, 8, { name: 'Trà mới' }, { mimetype: 'image/png' });
  assert.deepEqual(calls, [['menuChanged', 3]]);
});
