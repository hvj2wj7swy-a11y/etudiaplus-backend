const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/plans', subscriptionController.getPlans);
router.get('/current', authenticateToken, subscriptionController.getCurrent);
router.post('/checkout-session', authenticateToken, subscriptionController.createCheckoutSession);
router.post('/cancel', authenticateToken, subscriptionController.cancel);
router.post('/webhook', subscriptionController.webhook);

module.exports = router;
