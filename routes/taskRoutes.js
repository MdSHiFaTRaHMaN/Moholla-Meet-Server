const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

// Board routes
router.get('/board/project/:projectId', authenticateToken, taskController.getBoardByProject);
router.get('/board/:boardId', authenticateToken, taskController.getTasksByBoard);

// Task routes
router.post('/', authenticateToken, taskController.createTask);
router.put('/:id', authenticateToken, taskController.updateTask);
router.patch('/:id/move', authenticateToken, taskController.moveTask);
router.delete('/:id', authenticateToken, taskController.deleteTask);

// Comment & subtask routes
router.post('/:id/comments', authenticateToken, taskController.addComment);
router.patch('/:id/subtasks/:subtaskIndex/toggle', authenticateToken, taskController.toggleSubtask);

module.exports = router;
