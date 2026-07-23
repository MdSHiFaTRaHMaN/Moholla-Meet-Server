const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: false },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    url: { type: String, required: true },
    publicId: { type: String, default: '' },  // Cloudinary public_id for deletion
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: { type: String, enum: ['Document', 'Image', 'Archive', 'Code', 'Other'], default: 'Other' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.File || mongoose.model('File', FileSchema);
