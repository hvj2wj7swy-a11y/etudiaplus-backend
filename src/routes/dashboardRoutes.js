/**
 * Routes du tableau de bord
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

/**
 * GET /api/dashboard
 * Obtenir les données du tableau de bord
 */
router.get('/', authenticateToken, dashboardController.getDashboard);

/**
 * GET /api/dashboard/statistics/:userId
 * Obtenir les statistiques détaillées
 */
router.get('/statistics/:userId', authenticateToken, authorizeAdmin, dashboardController.getUserStatistics);

/**
 * GET /api/dashboard/statistics
 * Obtenir ses propres statistiques
 */
router.get('/statistics', authenticateToken, dashboardController.getUserStatistics);

module.exports = router;
