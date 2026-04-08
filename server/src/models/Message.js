import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['project', 'dm'], required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
    /** Sorted pair `id1::id2` for DM channels */
    dmKey: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

messageSchema.index({ projectId: 1, createdAt: -1 });
messageSchema.index({ dmKey: 1, createdAt: -1 });
messageSchema.index({ text: 'text' });

export const Message = mongoose.model('Message', messageSchema);
