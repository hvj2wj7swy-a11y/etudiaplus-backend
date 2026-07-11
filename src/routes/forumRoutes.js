/**
 * Routes du forum
 */

const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * POST /api/forum/questions
 * Créer une question
 */
router.post('/questions', authenticateToken, forumController.createQuestion);

/**
 * GET /api/forum/questions
 * Obtenir les questions
 */
router.get('/questions', forumController.getQuestions);

/**
 * GET /api/forum/questions/:id
 * Obtenir une question
 */
router.get('/questions/:id', forumController.getQuestion);

/**
 * POST /api/forum/questions/:questionId/answers
 * Créer une réponse
 */
router.post('/questions/:questionId/answers', authenticateToken, forumController.createAnswer);

/**
 * GET /api/forum/questions/:questionId/answers
 * Obtenir les réponses d'une question
 */
router.get('/questions/:questionId/answers', forumController.getAnswers);

/**
 * POST /api/forum/answers/:answerId/vote
 * Voter sur une réponse
 */
router.post('/answers/:answerId/vote', authenticateToken, forumController.voteAnswer);

/**
 * POST /api/forum/answers/:answerId/mark-solution
 * Marquer une réponse comme solution
 */
router.post('/answers/:answerId/mark-solution', authenticateToken, forumController.markAsSolution);

module.exports = router;
