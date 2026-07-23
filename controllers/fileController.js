const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const File = require('../models/File');

// ─── Get All Files ───────────────────────────────────────────────────────────
exports.getFiles = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50, workspaceId } = req.query;
    const query = {};

    const targetWsId = req.params.workspaceId || workspaceId;
    if (targetWsId && targetWsId !== 'undefined' && targetWsId !== 'null' && targetWsId !== 'ALL') {
      query.workspace = targetWsId;
    }

    if (category && category !== 'ALL') query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const files = await File.find(query)
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await File.countDocuments(query);

    const host = req.get('host');
    const protocol = req.protocol;
    const backendBase = `${protocol}://${host}`;

    const sanitizedFiles = files.map((file) => {
      const doc = file.toObject();
      if (doc.url) {
        if (!doc.url.startsWith('http://') && !doc.url.startsWith('https://')) {
          const filename = path.basename(doc.url);
          doc.url = `${backendBase}/uploads/${filename}`;
        }
      }
      return doc;
    });

    res.json({ success: true, files: sanitizedFiles, total, page: parseInt(page) });
  } catch (err) {
    console.error('[File] GetFiles error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch files.' });
  }
};



// ─── Upload File ─────────────────────────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { workspaceId } = req.body;
    const targetWsId = (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') ? workspaceId : null;

    // Detect category from mimetype
    let category = 'Other';
    const mime = req.file.mimetype || '';
    if (mime.startsWith('image/')) category = 'Image';
    else if (mime === 'application/pdf' || mime.includes('document')) category = 'Document';
    else if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) category = 'Archive';
    else if (mime.includes('javascript') || mime.includes('json') || mime.includes('text/')) category = 'Code';

    // Construct URL (Cloudinary vs Local disk)
    let fileUrl = req.file.path || '';
    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      const host = req.get('host');
      const protocol = req.protocol;
      const filename = req.file.filename || path.basename(req.file.path);
      fileUrl = `${protocol}://${host}/uploads/${filename}`;
    }

    const newFile = await File.create({
      workspace: targetWsId,
      name: req.file.originalname,
      size: req.file.size || 0,
      mimeType: req.file.mimetype,
      url: fileUrl,
      publicId: req.file.filename || req.file.originalname,
      uploadedBy: req.user.id,
      category
    });

    const populated = await newFile.populate('uploadedBy', 'name avatar');

    res.status(201).json({ success: true, file: populated });
  } catch (err) {
    console.error('[File] UploadFile error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'File upload failed.' });
  }
};

// ─── Delete File ─────────────────────────────────────────────────────────────
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Verify ownership
    if (file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this file.' });
    }

    // Remove from Cloudinary if it's a Cloudinary URL
    if (file.publicId && file.url && file.url.includes('cloudinary.com')) {
      try {
        await cloudinary.uploader.destroy(file.publicId, {
          resource_type: file.mimeType.startsWith('image/') ? 'image' : 'raw'
        });
      } catch (e) {
        console.warn('[File] Cloudinary deletion warning:', e.message);
      }
    } else if (file.url && file.url.includes('/uploads/')) {
      // Remove local disk file if exists
      const filename = path.basename(file.url);
      const filePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await file.deleteOne();
    res.json({ success: true, message: 'File deleted successfully.' });
  } catch (err) {
    console.error('[File] DeleteFile error:', err.message);
    res.status(500).json({ success: false, message: 'File deletion failed.' });
  }
};
