import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { initCloudinary } from './config/cloudinary.js';
import routes from './routes/index.js';
import { setIO } from './socket/index.js';
import { verifyToken } from './utils/token.js';
import { startDeadlineReminderJob } from './jobs/deadlineReminder.js';
import { startDailySummaryJob } from './jobs/dailySummary.js';

const app = express();
const server = http.createServer(app);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: clientOrigin, credentials: true },
});

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use(routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    const payload = verifyToken(token);
    socket.userId = payload.sub;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('join:project', (projectId) => {
    if (projectId) socket.join(`project:${projectId}`);
  });
  socket.on('join:user', () => {
    socket.join(`user:${socket.userId}`);
  });
  socket.on('join:chat:project', (projectId) => {
    if (projectId) socket.join(`chat:project:${projectId}`);
  });
  socket.on('join:chat:dm', async (otherUserId) => {
    try {
      const { buildDmKey } = await import('./controllers/messageController.js');
      if (!otherUserId) return;
      const key = buildDmKey(socket.userId, otherUserId);
      socket.join(`dm:${key}`);
    } catch (e) {
      console.error('[socket join:chat:dm]', e);
    }
  });
  socket.on('message:send', async (payload, ack) => {
    try {
      const { createAndBroadcastMessage } = await import('./controllers/messageController.js');
      const out = await createAndBroadcastMessage({
        channel: payload?.channel,
        text: payload?.text,
        projectId: payload?.projectId,
        recipientId: payload?.recipientId,
        senderId: socket.userId,
      });
      if (!out.ok) {
        ack?.({ error: out.message || 'Send failed' });
        return;
      }
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ error: e.message || 'Send failed' });
    }
  });
});

setIO(io);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

await connectDB(MONGODB_URI);
initCloudinary();
startDeadlineReminderJob();
startDailySummaryJob();

server.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
