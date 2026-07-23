const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['Owner', 'Admin', 'Member', 'Guest'], default: 'Member' },
        joinedAt: { type: Date, default: Date.now }
      }
    ],
    settings: {
      isPrivate: { type: Boolean, default: false },
      allowGuestInvite: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
