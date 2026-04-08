import { TaskVersion } from '../models/TaskVersion.js';

function buildSnapshot(taskDoc) {
  return {
    title: taskDoc.title,
    description: taskDoc.description,
    status: taskDoc.status,
    priority: taskDoc.priority,
    dueDate: taskDoc.dueDate,
    assignedTo: taskDoc.assignedTo,
    labels: [...(taskDoc.labels || [])],
    autoPriority: taskDoc.autoPriority,
    location: taskDoc.location
      ? {
          lat: taskDoc.location.lat,
          lng: taskDoc.location.lng,
          label: taskDoc.location.label,
          capturedAt: taskDoc.location.capturedAt,
        }
      : null,
    attachments: (taskDoc.attachments || []).map((a) => ({
      url: a.url,
      publicId: a.publicId,
      originalName: a.originalName,
      resourceType: a.resourceType,
    })),
  };
}

export async function saveTaskVersion(taskDoc, editedBy, changeNote = '') {
  const last = await TaskVersion.findOne({ taskId: taskDoc._id }).sort({ version: -1 });
  const version = (last?.version || 0) + 1;
  await TaskVersion.create({
    taskId: taskDoc._id,
    version,
    snapshot: buildSnapshot(taskDoc),
    editedBy,
    changeNote,
  });
  return version;
}

export async function getVersionsForTask(taskId) {
  return TaskVersion.find({ taskId }).sort({ version: -1 }).populate('editedBy', 'name email');
}
