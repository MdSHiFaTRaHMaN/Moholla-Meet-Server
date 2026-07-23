const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

router.get('/channels', authenticateToken, chatController.getChannels);
router.post('/channels', authenticateToken, chatController.createChannel);
router.post('/channels/:channelId/invite', authenticateToken, chatController.inviteMembers);
router.delete('/channels/:channelId/kick/:targetUserId', authenticateToken, chatController.kickMember);
router.delete('/channels/:channelId', authenticateToken, chatController.deleteChannel);

router.get('/messages/:channelId', authenticateToken, chatController.getMessages);
router.post('/messages', authenticateToken, chatController.sendMessage);
router.post('/messages/:id/reactions', authenticateToken, chatController.addReaction);

module.exports = router;
