const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roomUrl: { type: String, required: true },
    status: { type: String, enum: ['Scheduled', 'Live', 'Ended'], default: 'Scheduled' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);
