import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  },
  { timestamps: true }
);

commentSchema.index({ taskId: 1, createdAt: 1 });
commentSchema.index({ text: 'text' });

export const Comment = mongoose.model('Comment', commentSchema);
