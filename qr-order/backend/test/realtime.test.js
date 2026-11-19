import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { io as createClient } from 'socket.io-client';
import { createApp } from '../src/presentation/http/app.js';
import { publisher } from '../src/infrastructure/realtime/publisher.js';
import { initSocket } from '../src/infrastructure/realtime/socket.js';

const identities = {
  staffA: { sub: 'staff-a', storeId: 'store-a' },
  staffASecondSocket: { sub: 'staff-a', storeId: 'store-a' },
  staffB: { sub: 'staff-b', storeId: 'store-a' },
  staffOtherStore: { sub: 'staff-c', storeId: 'store-b' },
};

function connectClient(url, auth, { reconnection = false } = {}) {
  const socket = createClient(url, {
    auth,
    autoConnect: false,
    reconnection,
    reconnectionAttempts: 5,
    reconnectionDelay: 50,
    timeout: 2000,
    transports: ['websocket'],
  });

  const connected = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Socket connection timed out'));
    }, 3000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });
  });
  socket.connect();
  return { socket, connected };
}

function emitWithAck(socket, event, ...args) {
  return new Promise((resolve, reject) => {
    socket.timeout(1500).emit(event, ...args, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
}

test('Socket.IO authenticates clients and supports rooms, messages, presence, status and reconnect', async (t) => {
  const passThrough = (_request, _response, next) => next();
  const emptyHandler = (_request, response) => response.status(204).end();
  const app = createApp({
    env: { corsOrigins: ['http://localhost:5173'], isProd: false },
    query: async () => ({ rows: [{ ok: 1 }] }),
    apiLimiter: passThrough,
    limiters: { login: passThrough, order: passThrough },
    authMiddleware: { authenticate: passThrough, authorize: () => passThrough },
    controllers: {
      auth: { login: emptyHandler, me: emptyHandler },
      menu: { list: emptyHandler, create: emptyHandler, update: emptyHandler, delete: emptyHandler },
      orders: {
        staffList: emptyHandler,
        changeStatus: emptyHandler,
        checkout: emptyHandler,
        customerList: emptyHandler,
        customerCreate: emptyHandler,
      },
      tables: {
        list: emptyHandler,
        get: emptyHandler,
        create: emptyHandler,
        update: emptyHandler,
        updateStatus: emptyHandler,
        remove: emptyHandler,
        qr: emptyHandler,
        downloadQr: emptyHandler,
        regenerateQr: emptyHandler,
      },
      categories: {
        list: emptyHandler,
        get: emptyHandler,
        create: emptyHandler,
        update: emptyHandler,
        remove: emptyHandler,
      },
      products: {
        list: emptyHandler,
        get: emptyHandler,
        create: emptyHandler,
        update: emptyHandler,
        updateStatus: emptyHandler,
        remove: emptyHandler,
      },
      public: { verifyTable: emptyHandler, getTableMenu: emptyHandler },
      reports: { getSalesReport: emptyHandler },
    },
  });
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer, {
    corsOrigins: ['http://localhost:5173'],
    verifyToken(token) {
      if (!identities[token]) throw new Error('Invalid token');
      return identities[token];
    },
    async resolveTableToken(token) {
      if (token !== 'table-a') throw new Error('Invalid table token');
      return { storeId: 'store-a', id: 'table-a' };
    },
  });

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${httpServer.address().port}`;
  const clients = new Set();
  t.after(async () => {
    for (const client of clients) client.disconnect();
    await new Promise((resolve) => io.close(resolve));
  });

  const healthResponse = await fetch(`${url}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).status, 'success');

  await assert.rejects(connectClient(url, {}).connected);
  await assert.rejects(connectClient(url, { token: 'expired' }).connected);
  const observerConnection = connectClient(url, { token: 'staffB' });
  clients.add(observerConnection.socket);
  const observer = await observerConnection.connected;
  const online = once(observer, 'user:online');

  const staffConnection = connectClient(url, { token: 'staffA' });
  clients.add(staffConnection.socket);
  const staff = await staffConnection.connected;
  assert.deepEqual((await online)[0], { userId: 'staff-a', status: 'online' });

  const newOrder = once(observer, 'order:new');
  const notification = once(observer, 'notification');
  publisher.orderCreated({ id: 'order-1', storeId: 'store-a', tableId: 'table-a' });
  assert.equal((await newOrder)[0].id, 'order-1');
  assert.deepEqual((await notification)[0], {
    type: 'order:new',
    orderId: 'order-1',
    tableId: 'table-a',
  });

  const otherStoreConnection = connectClient(url, { token: 'staffOtherStore' });
  clients.add(otherStoreConnection.socket);
  const otherStore = await otherStoreConnection.connected;
  let leakedMessage = false;
  const onLeakedMessage = () => { leakedMessage = true; };
  otherStore.on('message:receive', onLeakedMessage);

  const receivedMessage = once(observer, 'message:receive');
  assert.deepEqual(await emitWithAck(staff, 'message:send', { text: '  Hello team  ' }), { ok: true });
  const message = (await receivedMessage)[0];
  assert.equal(message.userId, 'staff-a');
  assert.equal(message.text, 'Hello team');
  assert.ok(Number.isFinite(Date.parse(message.sentAt)));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(leakedMessage, false);
  otherStore.off('message:receive', onLeakedMessage);

  assert.deepEqual(await emitWithAck(staff, 'message:send', { text: '   ' }), {
    ok: false,
    error: 'INVALID_MESSAGE',
  });
  const rateResults = await Promise.all(
    Array.from({ length: 10 }, () => emitWithAck(staff, 'message:send', { text: 'rate test' })),
  );
  assert.equal(rateResults.filter((result) => result.ok).length, 9);
  assert.equal(rateResults.filter((result) => result.error === 'RATE_LIMITED').length, 1);

  const customerConnection = connectClient(url, { tableToken: 'table-a' });
  clients.add(customerConnection.socket);
  const customer = await customerConnection.connected;
  assert.deepEqual(await emitWithAck(customer, 'message:send', { text: 'not allowed' }), {
    ok: false,
    error: 'FORBIDDEN',
  });

  const status = await emitWithAck(staff, 'server:status');
  assert.equal(status.status, 'ok');
  assert.ok(Number.isFinite(status.uptime));

  const secondaryConnection = connectClient(url, { token: 'staffASecondSocket' });
  clients.add(secondaryConnection.socket);
  const secondary = await secondaryConnection.connected;
  const offline = once(observer, 'user:offline');
  staff.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 50));
  secondary.disconnect();
  assert.deepEqual((await offline)[0], { userId: 'staff-a', status: 'offline' });

  const reconnected = once(observer, 'user:online');
  const reconnectingConnection = connectClient(url, { token: 'staffA' }, { reconnection: true });
  clients.add(reconnectingConnection.socket);
  const reconnectingClient = await reconnectingConnection.connected;
  const reconnectedEvent = once(reconnectingClient, 'connect');
  io.sockets.sockets.get(reconnectingClient.id).conn.close();
  await reconnectedEvent;
  assert.deepEqual((await reconnected)[0], { userId: 'staff-a', status: 'online' });
});
