import mongoose from 'mongoose';

const taskVersionSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    version: { type: Number, required: true },
    snapshot: {
      title: String,
      description: String,
      status: String,
      priority: String,
      dueDate: Date,
      assignedTo: mongoose.Schema.Types.Mixed,
      labels: [String],
      autoPriority: Boolean,
      location: mongoose.Schema.Types.Mixed,
      attachments: [
        {
          url: String,
          publicId: String,
          originalName: String,
          resourceType: String,
        },
      ],
    },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeNote: { type: String, default: '' },
  },
  { timestamps: true }
);

taskVersionSchema.index({ taskId: 1, version: -1 });

export const TaskVersion = mongoose.model('TaskVersion', taskVersionSchema);
