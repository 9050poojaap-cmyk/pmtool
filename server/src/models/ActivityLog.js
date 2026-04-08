import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ projectId: 1, createdAt: -1 });
activityLogSchema.index({ taskId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
