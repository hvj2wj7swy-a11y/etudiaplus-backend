/**
 * Routes des utilisateurs
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/users/profile
 * Obtenir le profil de l'utilisateur connecté
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * PUT /api/users/profile
 * Mettre à jour le profil utilisateur
 */
router.put('/profile', authenticateToken, userController.updateProfile);

/**
 * GET /api/users/top-contributors
 * Obtenir les meilleurs contributeurs
 */
router.get('/top-contributors', userController.getTopContributors);

/**
 * GET /api/users/:id/public
 * Obtenir les informations publiques d'un utilisateur
 */
router.get('/:id/public', userController.getPublicProfile);

module.exports = router;
