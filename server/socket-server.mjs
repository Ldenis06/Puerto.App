import { createServer } from 'node:http';
import { Server } from 'socket.io';

const port = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://ldenis06.github.io';
const locations = new Map();
const cooldowns = new Map();
const firebaseApiKey = process.env.FIREBASE_API_KEY;

function haversine(a, b) {
  const r = 6371000;
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
function validLocation(payload) {
  return payload && typeof payload.userId === 'string' && typeof payload.lat === 'number' && typeof payload.lng === 'number' && Number.isFinite(payload.lat) && Number.isFinite(payload.lng) && Math.abs(payload.lat) <= 90 && Math.abs(payload.lng) <= 180;
}
const http = createServer((_, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'ok' })); });
const io = new Server(http, { cors: { origin: allowedOrigin, methods: ['GET', 'POST'] }, maxHttpBufferSize: 4096 });

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.firebaseToken;
  if (!firebaseApiKey || typeof token !== 'string') return next(new Error('Unauthorized'));
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
    const account = response.ok ? (await response.json()).users?.[0] : null;
    if (!account?.email) return next(new Error('Unauthorized'));
    socket.data.email = account.email.toLowerCase();
    next();
  } catch { next(new Error('Unauthorized')); }
});

io.on('connection', (socket) => {
  socket.on('location:update', (payload) => {
    if (!validLocation(payload)) return socket.emit('location:error', { error: 'Invalid coordinates' });
    if (payload.email && payload.email.toLowerCase() !== socket.data.email) return socket.emit('location:error', { error: 'Unauthorized location update' });
    locations.set(socket.id, { socketId: socket.id, userId: payload.userId, lat: payload.lat, lng: payload.lng, updatedAt: Date.now() });
    const active = [...locations.values()];
    io.emit('locations:update', active.map(({ socketId, ...location }) => location));
    for (let i = 0; i < active.length; i += 1) for (let j = i + 1; j < active.length; j += 1) {
      const distance = haversine(active[i], active[j]);
      if (distance > 25) continue;
      const key = [active[i].userId, active[j].userId].sort().join(':');
      if ((Date.now() - (cooldowns.get(key) || 0)) < 300000) continue;
      cooldowns.set(key, Date.now());
      active.filter((entry) => entry.userId !== active[i].userId && entry.userId !== active[j].userId).forEach((entry) => io.to(entry.socketId).emit('proximity-alert', { userIds: [active[i].userId, active[j].userId], meters: Math.round(distance) }));
    }
  });
  socket.on('disconnect', () => locations.delete(socket.id));
});
http.listen(port, () => console.log(`Socket server listening on ${port}`));
