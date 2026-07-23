const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, analyticsController.getDashboardAnalytics);

module.exports = router;
