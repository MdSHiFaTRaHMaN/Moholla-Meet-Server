const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

router.post('/assistant', authenticateToken, aiController.generateAssistantResponse);

module.exports = router;
