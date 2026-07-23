const { Server } = require('socket.io');
const Message = require('../models/Message');
const Task = require('../models/Task');
const config = require('../config/config');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Track online users: { socketId -> { userId, name, avatar, workspaceIds[] } }
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Connected: ${socket.id}`);

    // ─── Presence ─────────────────────────────────────────────────────────
    socket.on('user_online', (userData) => {
      onlineUsers.set(socket.id, userData);
      io.emit('presence_update', Array.from(onlineUsers.values()));
    });

    // ─── Join/Leave Channels ──────────────────────────────────────────────
    socket.on('join_channel', (channelId) => {
      if (!channelId) return;
      const room = `channel_${channelId}`;
      socket.join(room);
      console.log(`[Socket.IO] Socket ${socket.id} joined room ${room}`);
    });

    socket.on('leave_channel', (channelId) => {
      if (!channelId) return;
      const room = `channel_${channelId}`;
      socket.leave(room);
      console.log(`[Socket.IO] Socket ${socket.id} left room ${room}`);
    });

    // ─── Real-Time Messaging ───────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { channelId, senderId, senderName, senderAvatar, content, messageId } = data;
        if (!channelId || !content) return;

        let populated;
        if (messageId && !messageId.startsWith('temp_')) {
          populated = await Message.findById(messageId).populate('sender', 'name avatar role');
        }

        if (!populated) {
          const message = await Message.create({
            channel: channelId,
            sender: senderId,
            content
          });
          populated = await message.populate('sender', 'name avatar role');
        }

        // Broadcast to all channel members in room
        io.to(`channel_${channelId}`).emit('new_message', populated);
      } catch (err) {
        console.error('[Socket.IO] send_message error:', err.message);
        socket.emit('message_error', { error: 'Failed to send message.' });
      }
    });

    // ─── Typing Indicator ─────────────────────────────────────────────────
    socket.on('typing_status', ({ channelId, user, isTyping }) => {
      socket.to(`channel_${channelId}`).emit('user_typing', { user, isTyping });
    });

    // ─── Kanban Board Sync ────────────────────────────────────────────────
    socket.on('join_board', (boardId) => {
      socket.join(`board_${boardId}`);
    });

    socket.on('task_moved', async (data) => {
      try {
        const { taskId, boardId, columnId, order } = data;

        // Persist the new position to MongoDB
        await Task.findByIdAndUpdate(taskId, { columnId, order });

        // Broadcast to all board collaborators
        socket.to(`board_${boardId}`).emit('board_updated', data);
      } catch (err) {
        console.error('[Socket.IO] task_moved error:', err.message);
      }
    });

    socket.on('task_created', (data) => {
      socket.to(`board_${data.boardId}`).emit('board_task_added', data);
    });

    socket.on('task_deleted', (data) => {
      socket.to(`board_${data.boardId}`).emit('board_task_removed', data);
    });

    // ─── Document Collaboration ───────────────────────────────────────────
    socket.on('join_document', (docId) => {
      socket.join(`doc_${docId}`);
    });

    socket.on('leave_document', (docId) => {
      socket.leave(`doc_${docId}`);
    });

    socket.on('doc_content_change', ({ docId, content, updatedBy }) => {
      socket.to(`doc_${docId}`).emit('doc_updated', { content, updatedBy });
    });

    socket.on('doc_cursor_move', ({ docId, userId, position }) => {
      socket.to(`doc_${docId}`).emit('cursor_moved', { userId, position });
    });

    // ─── Real-Time Meeting Call Invites ─────────────────────────────────
    socket.on('send_meeting_invite', (inviteData) => {
      const { recipientId } = inviteData || {};
      if (!recipientId) return;

      for (const [targetSocketId, user] of onlineUsers.entries()) {
        const targetUserId = (user.userId || user._id || user.id)?.toString();
        if (targetUserId === recipientId.toString()) {
          io.to(targetSocketId).emit('incoming_meeting_invite', inviteData);
        }
      }
    });

    socket.on('respond_meeting_invite', (responseData) => {
      const { senderId } = responseData || {};
      if (!senderId) return;

      for (const [targetSocketId, user] of onlineUsers.entries()) {
        const targetUserId = (user.userId || user._id || user.id)?.toString();
        if (targetUserId === senderId.toString()) {
          io.to(targetSocketId).emit('meeting_invite_response', responseData);
        }
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Disconnected: ${socket.id}`);
      onlineUsers.delete(socket.id);
      io.emit('presence_update', Array.from(onlineUsers.values()));
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };
