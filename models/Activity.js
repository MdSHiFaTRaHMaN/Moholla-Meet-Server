const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g. "created task", "updated document", "moved kanban card"
    targetType: { type: String, required: true }, // e.g. "Task", "Document", "Message", "Project"
    targetTitle: { type: String, default: '' },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
