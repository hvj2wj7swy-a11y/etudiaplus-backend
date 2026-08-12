/**
 * Routes d'authentification
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * POST /api/auth/register
 * Inscription
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * Connexion
 */
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

/**
 * GET /api/auth/verify
 * Vérifier le token JWT
 */
router.get('/verify', authenticateToken, authController.verifyToken);

module.exports = router;
