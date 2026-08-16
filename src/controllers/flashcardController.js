const Flashcard = require('../models/Flashcard');

class FlashcardController {
  static async listDecks(req, res) {
    try {
      const decks = await Flashcard.getDecksByUser(req.user.id);

      return res.json({
        success: true,
        data: { decks }
      });
    } catch (error) {
      console.error('Erreur recuperation flashcards:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la recuperation des flashcards'
      });
    }
  }

  static async createDeck(req, res) {
    try {
      const { title, description } = req.body || {};

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le titre du paquet est requis'
        });
      }

      const deck = await Flashcard.createDeck(
        req.user.id,
        title.trim(),
        description?.trim() || ''
      );

      return res.status(201).json({
        success: true,
        data: { deck }
      });
    } catch (error) {
      console.error('Erreur creation paquet flashcards:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la creation du paquet'
      });
    }
  }

  static async getDeck(req, res) {
    try {
      const deck = await Flashcard.getDeckById(
        Number(req.params.id),
        req.user.id
      );

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      return res.json({
        success: true,
        data: { deck }
      });
    } catch (error) {
      console.error('Erreur detail paquet flashcards:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la recuperation du paquet'
      });
    }
  }

  static async updateDeck(req, res) {
    try {
      const { title, description } = req.body || {};

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le titre du paquet est requis'
        });
      }

      const deck = await Flashcard.updateDeck(
        Number(req.params.id),
        req.user.id,
        title.trim(),
        description?.trim() || ''
      );

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      return res.json({
        success: true,
        data: { deck }
      });
    } catch (error) {
      console.error('Erreur modification paquet flashcards:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la modification du paquet'
      });
    }
  }

  static async deleteDeck(req, res) {
    try {
      const deleted = await Flashcard.deleteDeck(
        Number(req.params.id),
        req.user.id
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      return res.json({
        success: true,
        data: { id: deleted.id }
      });
    } catch (error) {
      console.error('Erreur suppression paquet flashcards:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du paquet'
      });
    }
  }

  static async createCard(req, res) {
    try {
      const deckId = Number(req.params.id);

      const deck = await Flashcard.getDeckById(
        deckId,
        req.user.id
      );

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      const { question, answer } = req.body || {};

      if (!question?.trim() || !answer?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'La question et la reponse sont requises'
        });
      }

      const card = await Flashcard.createCard(
        deckId,
        question.trim(),
        answer.trim()
      );

      return res.status(201).json({
        success: true,
        data: { card }
      });
    } catch (error) {
      console.error('Erreur creation flashcard:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la creation de la carte'
      });
    }
  }

  static async updateCard(req, res) {
    try {
      const deckId = Number(req.params.id);

      const deck = await Flashcard.getDeckById(
        deckId,
        req.user.id
      );

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      const { question, answer } = req.body || {};

      if (!question?.trim() || !answer?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'La question et la reponse sont requises'
        });
      }

      const card = await Flashcard.updateCard(
        Number(req.params.cardId),
        deckId,
        question.trim(),
        answer.trim()
      );

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carte introuvable'
        });
      }

      return res.json({
        success: true,
        data: { card }
      });
    } catch (error) {
      console.error('Erreur modification flashcard:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la modification de la carte'
      });
    }
  }

  static async deleteCard(req, res) {
    try {
      const deckId = Number(req.params.id);

      const deck = await Flashcard.getDeckById(
        deckId,
        req.user.id
      );

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      const deleted = await Flashcard.deleteCard(
        Number(req.params.cardId),
        deckId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Carte introuvable'
        });
      }

      return res.json({
        success: true,
        data: { id: deleted.id }
      });
    } catch (error) {
      console.error('Erreur suppression flashcard:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la carte'
      });
    }
  }

  static async reviewCard(req, res) {
    try {
      const deckId = Number(req.params.id);

      const deck = await Flashcard.getDeckById(
        deckId,
        req.user.id
      );

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Paquet introuvable'
        });
      }

      const { known } = req.body || {};

      if (typeof known !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'La valeur known doit etre vraie ou fausse'
        });
      }

      const card = await Flashcard.recordReview(
        Number(req.params.cardId),
        known
      );

      if (!card || Number(card.deck_id) !== deckId) {
        return res.status(404).json({
          success: false,
          message: 'Carte introuvable'
        });
      }

      return res.json({
        success: true,
        data: { card }
      });
    } catch (error) {
      console.error('Erreur revision flashcard:', error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l enregistrement de la revision'
      });
    }
  }
}

module.exports = FlashcardController;