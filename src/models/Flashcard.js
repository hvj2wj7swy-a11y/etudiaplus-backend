const db = require('../config/database');

const Flashcard = {
  async createDeck(userId, title, description = '') {
    const query = `
      INSERT INTO flashcard_decks (
        user_id,
        title,
        description
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [
      userId,
      title,
      description
    ]);

    return result.rows[0];
  },

  async getDecksByUser(userId) {
    const query = `
      SELECT
        d.*,
        COUNT(c.id)::int AS card_count
      FROM flashcard_decks d
      LEFT JOIN flashcards c
        ON c.deck_id = d.id
      WHERE d.user_id = $1
      GROUP BY d.id
      ORDER BY d.updated_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  async getDeckById(deckId, userId) {
    const deckQuery = `
      SELECT *
      FROM flashcard_decks
      WHERE id = $1
        AND user_id = $2
    `;

    const deckResult = await db.query(deckQuery, [
      deckId,
      userId
    ]);

    if (!deckResult.rows[0]) {
      return null;
    }

    const cardsQuery = `
      SELECT *
      FROM flashcards
      WHERE deck_id = $1
      ORDER BY created_at ASC
    `;

    const cardsResult = await db.query(cardsQuery, [deckId]);

    return {
      ...deckResult.rows[0],
      cards: cardsResult.rows
    };
  },

  async updateDeck(deckId, userId, title, description = '') {
    const query = `
      UPDATE flashcard_decks
      SET
        title = $1,
        description = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
        AND user_id = $4
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      description,
      deckId,
      userId
    ]);

    return result.rows[0] || null;
  },

  async deleteDeck(deckId, userId) {
    const query = `
      DELETE FROM flashcard_decks
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `;

    const result = await db.query(query, [
      deckId,
      userId
    ]);

    return result.rows[0] || null;
  },

  async createCard(deckId, question, answer) {
    const query = `
      INSERT INTO flashcards (
        deck_id,
        question,
        answer
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [
      deckId,
      question,
      answer
    ]);

    return result.rows[0];
  },

  async updateCard(cardId, deckId, question, answer) {
    const query = `
      UPDATE flashcards
      SET
        question = $1,
        answer = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
        AND deck_id = $4
      RETURNING *
    `;

    const result = await db.query(query, [
      question,
      answer,
      cardId,
      deckId
    ]);

    return result.rows[0] || null;
  },

  async deleteCard(cardId, deckId) {
    const query = `
      DELETE FROM flashcards
      WHERE id = $1
        AND deck_id = $2
      RETURNING id
    `;

    const result = await db.query(query, [
      cardId,
      deckId
    ]);

    return result.rows[0] || null;
  },

  async recordReview(cardId, known) {
    const query = `
      UPDATE flashcards
      SET
        times_reviewed = times_reviewed + 1,
        times_known = times_known + $1,
        times_unknown = times_unknown + $2,
        last_reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [
      known ? 1 : 0,
      known ? 0 : 1,
      cardId
    ]);

    return result.rows[0] || null;
  }
};

module.exports = Flashcard;