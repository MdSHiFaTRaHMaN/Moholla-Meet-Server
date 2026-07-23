const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Local Disk Storage Engine
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Check if valid Cloudinary cloud name is configured (not placeholder or invalid test string)
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const isCloudinaryConfigured = cloudName && 
                               cloudName !== 'friendmeet' && 
                               cloudName !== 'your_cloud_name' &&
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;

let avatarStorage = localStorage;
let fileStorage = localStorage;

if (isCloudinaryConfigured) {
  try {
    avatarStorage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'collabspace/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
      }
    });

    fileStorage = new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => {
        let folder = 'collabspace/files';
        let resourceType = 'auto';

        if (file.mimetype.startsWith('image/')) {
          folder = 'collabspace/files/images';
          resourceType = 'image';
        } else if (file.mimetype === 'application/pdf' || file.mimetype.includes('document')) {
          folder = 'collabspace/files/documents';
          resourceType = 'raw';
        } else {
          resourceType = 'raw';
        }

        return {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true
        };
      }
    });
  } catch (e) {
    console.warn('[Upload Middleware] Cloudinary init failed, using local disk storage:', e.message);
    avatarStorage = localStorage;
    fileStorage = localStorage;
  }
} else {
  console.log('[Upload Middleware] Cloudinary cloud_name not configured or invalid. Using Local Disk Storage (/uploads).');
}

// File size limits
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_FILE_SIZE   = 50 * 1024 * 1024;  // 50 MB

const avatarFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for avatars.'), false);
  }
};

const fileFilter = (req, file, cb) => {
  const blocked = ['application/x-msdownload', 'application/x-sh', 'application/x-bat'];
  if (blocked.includes(file.mimetype)) {
    cb(new Error('Executable files are not allowed.'), false);
  } else {
    cb(null, true);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_AVATAR_SIZE },
  fileFilter: avatarFilter
}).single('avatar');

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
}).single('file');

module.exports = { uploadAvatar, uploadFile };

