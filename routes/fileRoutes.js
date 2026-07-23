const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile } = require('../middleware/upload');

router.get('/', authenticateToken, fileController.getFiles);
router.post('/upload', authenticateToken, uploadFile, fileController.uploadFile);
router.delete('/:id', authenticateToken, fileController.deleteFile);

module.exports = router;
