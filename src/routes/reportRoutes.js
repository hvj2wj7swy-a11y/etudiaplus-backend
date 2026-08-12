/**
 * Routes des signalements
 */

const express = require('express')
const router = express.Router()
const reportController = require('../controllers/reportController')
const {
  authenticateToken,
  authorizeAdmin
} = require('../middleware/authMiddleware')

/**
 * POST /api/reports
 * Créer un signalement
 */
router.post(
  '/',
  authenticateToken,
  reportController.createReport
)

/**
 * GET /api/reports
 * Obtenir tous les signalements — administrateur uniquement
 */
router.get(
  '/',
  authenticateToken,
  authorizeAdmin,
  reportController.getAllReports
)

/**
 * PATCH /api/reports/:id/ignore
 * Ignorer un signalement — administrateur uniquement
 */
router.patch(
  '/:id/ignore',
  authenticateToken,
  authorizeAdmin,
  reportController.ignoreReport
)

/**
 * PATCH /api/reports/:id/resolve
 * Résoudre un signalement — administrateur uniquement
 */
router.patch(
  '/:id/resolve',
  authenticateToken,
  authorizeAdmin,
  reportController.resolveReport
)

module.exports = router