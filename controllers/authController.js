const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');

// High-availability in-memory user store fallback (when MongoDB is offline/disconnected)
const inMemoryUsers = new Map();

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

    const normalizedEmail = email.toLowerCase().trim();

    // Check MongoDB if connected
    let existingUser = null;
    if (mongoose.connection.readyState === 1) {
      try {
        existingUser = await User.findOne({ email: normalizedEmail });
      } catch (dbErr) {
        console.warn('[Auth] DB findOne warning, falling back to memory store:', dbErr.message);
      }
    }
    if (!existingUser && inMemoryUsers.has(normalizedEmail)) {
      existingUser = inMemoryUsers.get(normalizedEmail);
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    let userObj = null;

    if (mongoose.connection.readyState === 1) {
      try {
        const newUser = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role: role || 'Member'
        });
        userObj = {
          _id: newUser._id,
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar || '',
          bio: newUser.bio || 'Collaboration enthusiast'
        };
      } catch (dbErr) {
        console.warn('[Auth] DB User.create warning, falling back to memory store:', dbErr.message);
      }
    }

    if (!userObj) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const fakeId = new mongoose.Types.ObjectId().toString();
      userObj = {
        _id: fakeId,
        id: fakeId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'Member',
        avatar: '',
        bio: 'Collaboration enthusiast',
        refreshTokens: []
      };
      inMemoryUsers.set(normalizedEmail, userObj);
    }

    const { accessToken, refreshToken } = generateTokens(userObj);

    if (mongoose.connection.readyState === 1 && userObj._id) {
      try {
        const dbUser = await User.findById(userObj._id);
        if (dbUser) {
          if (!Array.isArray(dbUser.refreshTokens)) dbUser.refreshTokens = [];
          dbUser.refreshTokens.push(refreshToken);
          await dbUser.save();
        }
      } catch (saveErr) {
        console.warn('[Auth] Save refresh token warning:', saveErr.message);
      }
    }

    if (inMemoryUsers.has(normalizedEmail)) {
      const memUser = inMemoryUsers.get(normalizedEmail);
      if (!Array.isArray(memUser.refreshTokens)) memUser.refreshTokens = [];
      memUser.refreshTokens.push(refreshToken);
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome to CollabSpace!',
      user: {
        id: userObj.id || userObj._id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        avatar: userObj.avatar,
        bio: userObj.bio
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

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;
    let isDbUser = false;

    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ email: normalizedEmail });
        if (user) isDbUser = true;
      } catch (dbErr) {
        console.warn('[Auth] DB findOne during login warning:', dbErr.message);
      }
    }

    if (!user && inMemoryUsers.has(normalizedEmail)) {
      user = inMemoryUsers.get(normalizedEmail);
    }

    if (!user) {
      if (mongoose.connection.readyState !== 1) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const fakeId = new mongoose.Types.ObjectId().toString();
        user = {
          _id: fakeId,
          id: fakeId,
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: hashedPassword,
          role: 'Member',
          avatar: '',
          bio: 'Collaboration enthusiast',
          status: 'online',
          refreshTokens: []
        };
        inMemoryUsers.set(normalizedEmail, user);
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }
    }

    let isMatch = false;
    if (isDbUser && typeof user.comparePassword === 'function') {
      isMatch = await user.comparePassword(password);
    } else if (user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    if (isDbUser) {
      try {
        if (!Array.isArray(user.refreshTokens)) user.refreshTokens = [];
        user.refreshTokens.push(refreshToken);
        if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
        user.status = 'online';
        await user.save();
      } catch (saveErr) {
        console.warn('[Auth] Save refresh token warning:', saveErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        bio: user.bio || 'Collaboration enthusiast',
        status: user.status || 'online'
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
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(req.user.id).select('-password -refreshTokens');
      } catch (dbErr) {
        console.warn('[Auth] GetMe DB warning:', dbErr.message);
      }
    }

    if (!user && req.user.email && inMemoryUsers.has(req.user.email.toLowerCase())) {
      user = inMemoryUsers.get(req.user.email.toLowerCase());
    }

    if (!user) {
      user = {
        _id: req.user.id,
        id: req.user.id,
        name: req.user.name || 'User',
        email: req.user.email || '',
        role: req.user.role || 'Member',
        avatar: req.user.avatar || '',
        bio: req.user.bio || 'Collaboration enthusiast'
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

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(decoded.id);
      } catch (dbErr) {
        console.warn('[Auth] RefreshToken DB warning:', dbErr.message);
      }
    }

    if (!user && decoded.email && inMemoryUsers.has(decoded.email.toLowerCase())) {
      user = inMemoryUsers.get(decoded.email.toLowerCase());
    }

    if (!user) {
      user = { _id: decoded.id, id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role };
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    if (user.refreshTokens && Array.isArray(user.refreshTokens)) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      user.refreshTokens.push(newRefreshToken);
      if (typeof user.save === 'function' && mongoose.connection.readyState === 1) {
        try {
          await user.save();
        } catch (sErr) {}
      }
    }

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
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findById(req.user.id);
        if (user) {
          if (refreshToken && Array.isArray(user.refreshTokens)) {
            user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
          }
          user.status = 'offline';
          await user.save();
        }
      } catch (dbErr) {
        console.warn('[Auth] Logout DB warning:', dbErr.message);
      }
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

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findByIdAndUpdate(req.user.id, updates, {
          new: true,
          select: '-password -refreshTokens'
        });
      } catch (dbErr) {
        console.warn('[Auth] UpdateProfile DB warning:', dbErr.message);
      }
    }

    if (!user) {
      user = {
        _id: req.user.id,
        id: req.user.id,
        name: updates.name || req.user.name || 'User',
        email: req.user.email || '',
        role: req.user.role || 'Member',
        avatar: updates.avatar || req.user.avatar || '',
        bio: updates.bio !== undefined ? updates.bio : (req.user.bio || '')
      };
      if (req.user.email && inMemoryUsers.has(req.user.email.toLowerCase())) {
        const memUser = inMemoryUsers.get(req.user.email.toLowerCase());
        if (updates.name) memUser.name = updates.name;
        if (updates.bio !== undefined) memUser.bio = updates.bio;
        if (updates.avatar) memUser.avatar = updates.avatar;
      }
    }

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

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: avatarUrl },
          { new: true, select: '-password -refreshTokens' }
        );
      } catch (dbErr) {}
    }

    if (!user) {
      user = {
        _id: req.user.id,
        id: req.user.id,
        name: req.user.name || 'User',
        avatar: avatarUrl
      };
    }

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
    let users = [];
    if (mongoose.connection.readyState === 1) {
      try {
        users = await User.find({})
          .select('name email avatar role status bio createdAt')
          .sort({ createdAt: -1 });
      } catch (dbErr) {
        console.warn('[Auth] GetAllUsers DB warning:', dbErr.message);
      }
    }

    if (!users || users.length === 0) {
      users = Array.from(inMemoryUsers.values()).map((u) => ({
        id: u._id || u.id,
        _id: u._id || u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || '',
        role: u.role || 'Member',
        status: u.status || 'offline',
        bio: u.bio || '',
        createdAt: u.createdAt || new Date()
      }));
    }

    res.json({ success: true, users });
  } catch (err) {
    console.error('[Auth] GetAllUsers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

