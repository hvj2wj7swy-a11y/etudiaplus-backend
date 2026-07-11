/**
 * Routes des documents
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Configuration de multer pour le téléversement
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF, Word et PowerPoint sont autorisés'));
    }
  }
});

/**
 * POST /api/documents/upload
 * Téléverser un document
 */
router.post('/upload', authenticateToken, upload.single('file'), documentController.uploadDocument);

/**
 * GET /api/documents
 * Obtenir tous les documents
 */
router.get('/', documentController.getAllDocuments);

/**
 * GET /api/documents/:id
 * Obtenir un document
 */
router.get('/:id', documentController.getDocument);

/**
 * POST /api/documents/:id/rate
 * Évaluer un document
 */
router.post('/:id/rate', authenticateToken, documentController.rateDocument);

/**
 * POST /api/documents/:id/report
 * Signaler un document
 */
router.post('/:id/report', authenticateToken, documentController.reportDocument);

/**
 * GET /api/documents/user/:userId
 * Obtenir les documents d'un utilisateur
 */
router.get('/user/:userId', documentController.getUserDocuments);

module.exports = router;
