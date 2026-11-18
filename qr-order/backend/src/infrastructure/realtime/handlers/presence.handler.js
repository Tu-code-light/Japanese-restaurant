import { rooms } from '../publisher.js';

export function registerPresenceHandler(io, socket, presence) {
  const { kind, storeId, userId } = socket.data;
  if (kind !== 'staff') return;

  const key = `${storeId}:${userId}`;
  let sockets = presence.get(key);
  if (!sockets) {
    sockets = new Set();
    presence.set(key, sockets);
  }

  sockets.add(socket.id);
  if (sockets.size === 1) {
    io.to(rooms.store(storeId)).emit('user:online', { userId, status: 'online' });
  }

  socket.on('disconnect', () => {
    const activeSockets = presence.get(key);
    if (!activeSockets) return;

    activeSockets.delete(socket.id);
    if (activeSockets.size === 0) {
      presence.delete(key);
      io.to(rooms.store(storeId)).emit('user:offline', { userId, status: 'offline' });
    }
  });
}
