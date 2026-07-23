const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, uppercase: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    status: { type: String, enum: ['Planning', 'Active', 'On Hold', 'Completed'], default: 'Active' },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
