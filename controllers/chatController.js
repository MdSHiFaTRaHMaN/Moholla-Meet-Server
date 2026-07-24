const Channel = require('../models/Channel');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');

// ─── Get Channels for Workspace ──────────────────────────────────────────────
exports.getChannels = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    // Allow access to workspace channels or channels where user is explicitly a member
    const query = workspaceId
      ? { $or: [{ workspace: workspaceId }, { members: req.user.id }] }
      : { members: req.user.id };

    const channels = await Channel.find(query)
      .populate('members', 'name avatar status role')
      .populate('creator', 'name avatar')
      .sort({ createdAt: 1 });

    res.json({ success: true, channels });
  } catch (err) {
    console.error('[Chat] GetChannels error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch channels.' });
  }
};

// ─── Create Channel ──────────────────────────────────────────────────────────
exports.createChannel = async (req, res) => {
  try {
    const { workspaceId, name, topic, isDirect, memberIds } = req.body;

    if (!name && !isDirect) {
      return res.status(400).json({ success: false, message: 'Channel name is required.' });
    }

    // Automatically include all members of the workspace in new channels by default
    let allWsMemberIds = [];
    if (workspaceId) {
      try {
        const ws = await Workspace.findById(workspaceId);
        if (ws && Array.isArray(ws.members)) {
          allWsMemberIds = ws.members.map((m) => (m.user ? m.user.toString() : m.toString()));
        }
      } catch (_) {}
    }

    const members = memberIds && memberIds.length > 0
      ? [...new Set([req.user.id, ...memberIds, ...allWsMemberIds])]
      : [...new Set([req.user.id, ...allWsMemberIds])];

    const channel = await Channel.create({
      workspace: workspaceId,
      name: isDirect ? '' : name.toLowerCase().trim().replace(/\s+/g, '-'),
      topic: topic || '',
      isDirect: isDirect || false,
      creator: req.user.id,
      admins: [req.user.id],
      members
    });

    await channel.populate('members', 'name avatar status role');
    await channel.populate('creator', 'name avatar');

    // Broadcast new_channel to all connected clients via Socket.IO
    try {
      const { getIO } = require('../socket/socketManager');
      getIO().emit('new_channel', channel);
    } catch (_) {}

    res.status(201).json({ success: true, channel });
  } catch (err) {
    console.error('[Chat] CreateChannel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create channel.' });
  }
};

// ─── Invite Members to Channel ───────────────────────────────────────────────
exports.inviteMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs array required.' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found.' });
    }

    const existingMembers = channel.members.map((m) => m.toString());
    userIds.forEach((uid) => {
      if (!existingMembers.includes(uid)) {
        channel.members.push(uid);
      }
    });

    // Ensure invited members are also in the workspace members list
    if (channel.workspace) {
      const workspace = await Workspace.findById(channel.workspace);
      if (workspace) {
        const wsMemberIds = workspace.members.map((m) => (m.user ? m.user.toString() : m.toString()));
        userIds.forEach((uid) => {
          if (!wsMemberIds.includes(uid)) {
            workspace.members.push({ user: uid, role: 'Member', joinedAt: new Date() });
          }
        });
        await workspace.save();
      }
    }

    await channel.save();
    await channel.populate('members', 'name avatar status role');
    await channel.populate('creator', 'name avatar');

    res.json({ success: true, channel });
  } catch (err) {
    console.error('[Chat] InviteMembers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to invite members to channel.' });
  }
};

// ─── Kick Member from Channel (Admin Only) ──────────────────────────────────
exports.kickMember = async (req, res) => {
  try {
    const { channelId, targetUserId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found.' });
    }

    const isCreator = channel.creator && channel.creator.toString() === req.user.id;
    const isAdmin = channel.admins && channel.admins.some((a) => a.toString() === req.user.id);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only channel admins/creators can kick members.' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Admins cannot kick themselves from the channel.' });
    }

    channel.members = channel.members.filter((m) => m.toString() !== targetUserId);
    if (channel.admins) {
      channel.admins = channel.admins.filter((a) => a.toString() !== targetUserId);
    }

    await channel.save();
    await channel.populate('members', 'name avatar status role');
    await channel.populate('creator', 'name avatar');

    res.json({ success: true, message: 'User kicked successfully from channel.', channel });
  } catch (err) {
    console.error('[Chat] KickMember error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to kick member.' });
  }
};

// ─── Delete Channel ─────────────────────────────────────────────────────────
exports.deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found.' });
    }

    const isCreator = channel.creator && channel.creator.toString() === req.user.id;
    const isAdmin = channel.admins && channel.admins.some((a) => a.toString() === req.user.id);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only channel creator or admin can delete this channel.' });
    }

    await Message.deleteMany({ channel: channelId });
    await channel.deleteOne();

    res.json({ success: true, message: 'Channel deleted successfully.' });
  } catch (err) {
    console.error('[Chat] DeleteChannel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete channel.' });
  }
};

// ─── Get Messages for a Channel ──────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ channel: channelId })
      .populate('sender', 'name avatar role')
      .sort({ createdAt: -1 })                         // newest first
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Return in chronological order for UI display
    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error('[Chat] GetMessages error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

// ─── Send Message (REST fallback — also sent via Socket.IO) ──────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { channelId, content, attachments } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const message = await Message.create({
      channel: channelId,
      sender: req.user.id,
      content: content.trim(),
      attachments: attachments || []
    });

    await message.populate('sender', 'name avatar role');

    // Broadcast in real-time via Socket.IO to all users in this channel
    try {
      const { getIO } = require('../socket/socketManager');
      getIO().to(`channel_${channelId}`).emit('new_message', message);
    } catch (_) { }

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('[Chat] SendMessage error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

// ─── Add Reaction ────────────────────────────────────────────────────────────
exports.addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const message = await Message.findById(id);

    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    const existingReaction = message.reactions.find((r) => r.emoji === emoji);
    if (existingReaction) {
      const userIdx = existingReaction.users.indexOf(req.user.id);
      if (userIdx === -1) {
        existingReaction.users.push(req.user.id);
      } else {
        existingReaction.users.splice(userIdx, 1); // Toggle off
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      }
    } else {
      message.reactions.push({ emoji, users: [req.user.id] });
    }

    await message.save();
    res.json({ success: true, reactions: message.reactions });
  } catch (err) {
    console.error('[Chat] AddReaction error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add reaction.' });
  }
};
