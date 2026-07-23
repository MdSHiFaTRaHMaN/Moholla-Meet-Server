const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, boardController.getBoards);
router.get('/:id', authenticateToken, boardController.getBoardById);

module.exports = router;
