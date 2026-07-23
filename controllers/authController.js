const path = require('path');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');

// ─── Register ──────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'Member'
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in DB
    if (!Array.isArray(user.refreshTokens)) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(refreshToken);
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome to CollabSpace!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in DB (keep max 5 devices)
    if (!Array.isArray(user.refreshTokens)) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    user.status = 'online';

    try {
      await user.save();
    } catch (saveErr) {
      console.warn('[Auth] Login user.save warning:', saveErr.message);
    }

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─── Get Current User ──────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.user.id).select('-password -refreshTokens');
    }
    if (!user) {
      user = {
        _id: req.user.id,
        id: req.user.id,
        name: req.user.name || 'User',
        email: req.user.email || '',
        role: req.user.role || 'Member',
        avatar: req.user.avatar || '',
        bio: req.user.bio || ''
      };
    }
    res.json({ success: true, user });
  } catch (err) {
    console.warn('[Auth] GetMe fallback active:', err.message);
    res.json({
      success: true,
      user: {
        _id: req.user.id,
        id: req.user.id,
        name: req.user.name || 'User',
        email: req.user.email || '',
        role: req.user.role || 'Member',
        avatar: req.user.avatar || '',
        bio: req.user.bio || ''
      }
    });
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ success: false, message: 'Refresh token not recognized.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({ success: true, tokens: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    console.error('[Auth] RefreshToken error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user.id);

    if (user) {
      // Remove the specific refresh token (device logout)
      if (refreshToken) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      }
      user.status = 'offline';
      await user.save();
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[Auth] Logout error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// ─── Update Profile ────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      select: '-password -refreshTokens'
    });
    res.json({ success: true, user });
  } catch (err) {
    console.error('[Auth] UpdateProfile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
};

// ─── Upload Avatar ─────────────────────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    let avatarUrl = req.file.path || '';
    if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
      const host = req.get('host');
      const protocol = req.protocol;
      const filename = req.file.filename || path.basename(req.file.path);
      avatarUrl = `${protocol}://${host}/uploads/${filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true, select: '-password -refreshTokens' }
    );

    res.json({
      success: true,
      message: 'Avatar updated successfully.',
      avatarUrl,
      user
    });
  } catch (err) {
    console.error('[Auth] UploadAvatar error:', err.message);
    res.status(500).json({ success: false, message: 'Avatar upload failed.' });
  }
};

// ─── Get All Users ──────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email avatar role status bio createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (err) {
    console.error('[Auth] GetAllUsers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};
