const express = require('express');
const router = express.Router();
const docController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, docController.getDocuments);
router.post('/', authenticateToken, docController.createDocument);
router.get('/:id', authenticateToken, docController.getDocumentById);
router.put('/:id', authenticateToken, docController.updateDocument);
router.delete('/:id', authenticateToken, docController.deleteDocument);
router.post('/:id/collaborators', authenticateToken, docController.addCollaborator);

module.exports = router;
