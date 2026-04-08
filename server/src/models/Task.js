import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    originalName: { type: String, default: '' },
    resourceType: { type: String, default: 'auto' },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    label: { type: String, default: '' },
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Done'],
      default: 'To Do',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    dueDate: { type: Date, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    attachments: [attachmentSchema],
    labels: [{ type: String, trim: true }],
    position: { type: Number, default: 0 },
    autoPriority: { type: Boolean, default: true },
    location: { type: locationSchema, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, status: 1, position: 1 });
taskSchema.index({ projectId: 1, assignedTo: 1 });
taskSchema.index({ projectId: 1, priority: 1 });
taskSchema.index({ labels: 1 });
taskSchema.index({ title: 'text', description: 'text', labels: 'text' });

export const Task = mongoose.model('Task', taskSchema);
