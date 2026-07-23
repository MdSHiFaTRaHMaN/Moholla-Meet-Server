const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes (require valid JWT)
router.get('/me', authenticateToken, authController.getMe);
router.get('/users', authenticateToken, authController.getAllUsers);
router.post('/logout', authenticateToken, authController.logout);
router.patch('/profile', authenticateToken, authController.updateProfile);
router.post('/avatar', authenticateToken, uploadAvatar, authController.uploadAvatar);

module.exports = router;
