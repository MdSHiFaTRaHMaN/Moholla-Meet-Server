const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, meetingController.getMeetings);
router.post('/', authenticateToken, meetingController.createMeeting);
router.patch('/:id/status', authenticateToken, meetingController.updateMeetingStatus);
router.delete('/:id', authenticateToken, meetingController.deleteMeeting);

module.exports = router;
