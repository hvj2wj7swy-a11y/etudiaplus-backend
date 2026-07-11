const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', noteController.listNotebooks);
router.post('/', noteController.createNotebook);
router.get('/:id', noteController.getNotebook);
router.put('/:id', noteController.updateNotebook);
router.post('/:id/pages', noteController.createPage);
router.put('/:id/pages/:pageId', noteController.updatePage);

module.exports = router;