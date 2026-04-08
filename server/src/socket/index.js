let ioRef = null;

export function setIO(io) {
  ioRef = io;
}

export function getIO() {
  return ioRef;
}

export function emitToProject(projectId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`project:${projectId}`).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`user:${userId}`).emit(event, payload);
}

export function emitChatProject(projectId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`chat:project:${projectId}`).emit(event, payload);
}

export function emitDmRoom(dmKey, event, payload) {
  if (!ioRef) return;
  ioRef.to(`dm:${dmKey}`).emit(event, payload);
}
