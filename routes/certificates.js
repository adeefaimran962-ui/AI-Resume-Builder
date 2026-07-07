/**
 * routes/certificates.js
 * Certificate Manager Routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const certificateController = require('../controllers/certificateController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Configure multer for certificate file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/certificates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, 'cert_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Certificate routes
router.get('/', certificateController.index);
router.get('/new', certificateController.showCreateForm);
router.post('/', upload.single('certificateFile'), certificateController.create);
router.get('/:id', certificateController.show);
router.get('/:id/edit', certificateController.showEditForm);
router.put('/:id', upload.single('certificateFile'), certificateController.update);
router.delete('/:id', certificateController.destroy);
router.get('/:id/download', certificateController.download);

module.exports = router;