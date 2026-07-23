const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number
      }
    ],
    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
