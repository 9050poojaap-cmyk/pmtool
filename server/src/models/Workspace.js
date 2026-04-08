import mongoose from 'mongoose';

const wsMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
  },
  { _id: false }
);

const pluginSchema = new mongoose.Schema(
  {
    chat: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [wsMemberSchema],
    plugins: { type: pluginSchema, default: () => ({}) },
  },
  { timestamps: true }
);

workspaceSchema.index({ name: 'text', description: 'text' });

export const Workspace = mongoose.model('Workspace', workspaceSchema);
