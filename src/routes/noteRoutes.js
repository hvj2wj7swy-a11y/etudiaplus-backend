const express = require('express');
const router = express.Router();

const noteController = require('../controllers/noteController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', noteController.listNotebooks);
router.post('/', noteController.createNotebook);

router.get('/folders', noteController.listFolders);
router.post('/folders', noteController.createFolder);

router.get('/:id', noteController.getNotebook);
router.put('/:id', noteController.updateNotebook);

router.patch('/:id/favorite', noteController.toggleFavorite);
router.patch('/:id/trash', noteController.toggleTrash);
router.patch('/:id/folder', noteController.moveFolder);

router.patch('/folders/rename', noteController.renameFolder);
router.delete('/folders', noteController.deleteFolder);

router.post('/:id/pages', noteController.createPage);
router.put('/:id/pages/:pageId', noteController.updatePage);
router.delete('/:id/pages/:pageId', noteController.deletePage);

module.exports = router;