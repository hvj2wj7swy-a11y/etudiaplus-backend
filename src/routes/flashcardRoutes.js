const express = require('express');
const router = express.Router();

const flashcardController = require('../controllers/flashcardController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Paquets de flashcards
router.get('/', flashcardController.listDecks);
router.post('/', flashcardController.createDeck);

router.get('/:id', flashcardController.getDeck);
router.put('/:id', flashcardController.updateDeck);
router.delete('/:id', flashcardController.deleteDeck);

// Cartes d'un paquet
router.post('/:id/cards', flashcardController.createCard);

router.put(
  '/:id/cards/:cardId',
  flashcardController.updateCard
);

router.delete(
  '/:id/cards/:cardId',
  flashcardController.deleteCard
);

// Révision : "Je sais / Je ne sais pas"
router.patch(
  '/:id/cards/:cardId/review',
  flashcardController.reviewCard
);

module.exports = router;