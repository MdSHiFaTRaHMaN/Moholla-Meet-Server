const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
  order: { type: Number, default: 0 }
});

const BoardSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    columns: [ColumnSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Board || mongoose.model('Board', BoardSchema);
