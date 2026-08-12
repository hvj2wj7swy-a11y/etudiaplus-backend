/**
 * Routes des utilisateurs
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  authenticateToken,
  authorizeAdmin
} = require('../middleware/authMiddleware');

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
 * GET /api/users
 * Liste de tous les utilisateurs (admin)
 */
router.get(
  '/',
  authenticateToken,
  authorizeAdmin,
  userController.getAllUsers
);

router.get('/:id/public', userController.getPublicProfile);
/**
 * PATCH /api/users/:id/role
 * Modifier le rôle d’un utilisateur — administrateur uniquement
 */
/**
 * PATCH /api/users/:id
 * Modifier les informations d’un utilisateur — administrateur uniquement
 */
router.patch(
  '/:id',
  authenticateToken,
  authorizeAdmin,
  userController.updateUser
);
router.patch(
  '/:id/role',
  authenticateToken,
  authorizeAdmin,
  userController.updateUserRole
);

/**
 * PATCH /api/users/:id/status
 * Activer ou désactiver un utilisateur — administrateur uniquement
 */
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeAdmin,
  userController.updateUserStatus
);

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur - administrateur uniquement
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeAdmin,
  userController.deleteUser
);

module.exports = router;
