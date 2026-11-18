import { rooms } from '../publisher.js';

const WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 10;
const MAX_MESSAGE_LENGTH = 1000;

export function registerMessageHandler(io, socket) {
  let windowStartedAt = Date.now();
  let messagesInWindow = 0;

  socket.on('message:send', (payload, acknowledge) => {
    const reply = (result) => {
      if (typeof acknowledge === 'function') acknowledge(result);
      else if (!result.ok) socket.emit('message:error', result);
    };

    if (socket.data.kind !== 'staff') {
      reply({ ok: false, error: 'FORBIDDEN' });
      return;
    }

    if (!payload || typeof payload.text !== 'string') {
      reply({ ok: false, error: 'INVALID_MESSAGE' });
      return;
    }

    const text = payload.text.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      reply({ ok: false, error: 'INVALID_MESSAGE' });
      return;
    }

    const now = Date.now();
    if (now - windowStartedAt >= WINDOW_MS) {
      windowStartedAt = now;
      messagesInWindow = 0;
    }
    if (messagesInWindow >= MAX_MESSAGES_PER_WINDOW) {
      reply({ ok: false, error: 'RATE_LIMITED' });
      return;
    }
    messagesInWindow += 1;

    const message = {
      userId: socket.data.userId,
      text,
      sentAt: new Date(now).toISOString(),
    };
    io.to(rooms.store(socket.data.storeId)).emit('message:receive', message);
    reply({ ok: true });
  });
}
