export function registerSystemHandler(_io, socket) {
  socket.on('server:status', (acknowledge) => {
    const status = { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
    if (typeof acknowledge === 'function') acknowledge(status);
    else socket.emit('server:status', status);
  });
}
