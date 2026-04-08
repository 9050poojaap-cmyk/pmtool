import { io } from 'socket.io-client';
import { store } from './store/store';
import { mergeTask, removeTask, replaceColumn } from './store/tasksSlice';
import { pushNotification } from './store/uiSlice';

const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    socket.emit('join:user');
  });
  socket.on('task:created', ({ task }) => {
    store.dispatch(mergeTask(task));
  });
  socket.on('task:updated', ({ task }) => {
    store.dispatch(mergeTask(task));
  });
  socket.on('task:moved', ({ task }) => {
    store.dispatch(mergeTask(task));
  });
  socket.on('task:deleted', ({ taskId }) => {
    store.dispatch(removeTask(taskId));
  });
  socket.on('tasks:reordered', ({ status, tasks }) => {
    if (tasks?.length) {
      store.dispatch(replaceColumn({ status, tasks }));
    }
  });
  socket.on('notification', (payload) => {
    store.dispatch(pushNotification(payload));
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinProjectRoom(projectId) {
  if (socket?.connected && projectId) {
    socket.emit('join:project', projectId);
  }
}

export function joinProjectChatRoom(projectId) {
  if (socket?.connected && projectId) {
    socket.emit('join:user');
    socket.emit('join:chat:project', projectId);
  }
}

export function joinDmChatRoom(otherUserId) {
  if (socket?.connected && otherUserId) {
    socket.emit('join:user');
    socket.emit('join:chat:dm', otherUserId);
  }
}

export function sendSocketMessage(payload, ack) {
  if (!socket?.connected) return;
  socket.emit('message:send', payload, ack);
}

export function onMessageReceive(handler) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('message:receive', handler);
  return () => s.off('message:receive', handler);
}
