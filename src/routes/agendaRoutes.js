const express = require('express');
const router = express.Router();

const agendaController =
  require('../controllers/agendaController');

const {
  authenticateToken
} = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', agendaController.list);
router.post('/', agendaController.create);
router.put('/:id', agendaController.update);
router.delete(
  '/series/:groupId',
  agendaController.removeSeries
);
router.delete('/:id', agendaController.remove);

module.exports = router;