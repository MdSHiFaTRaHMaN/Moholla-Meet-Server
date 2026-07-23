const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, workspaceController.getWorkspaces);
router.post('/', authenticateToken, workspaceController.createWorkspace);
router.get('/:id', authenticateToken, workspaceController.getWorkspaceById);
router.put('/:id', authenticateToken, workspaceController.updateWorkspace);
router.post('/:id/invite', authenticateToken, workspaceController.inviteMember);

module.exports = router;
