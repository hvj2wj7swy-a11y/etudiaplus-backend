/**
 * Modèle ForumAnswer - Gestion des réponses du forum
 */

const { query } = require('../config/database');

class ForumAnswer {
  /**
   * Créer une nouvelle réponse
   */
  static async create(answerData) {
    const { questionId, content, answeredBy } = answerData;
    
    const text = `
      INSERT INTO forum_answers (question_id, content, answered_by)
      VALUES ($1, $2, $3)
      RETURNING id, question_id, content, answered_by, helpful_votes, created_at
    `;
    
    const res = await query(text, [questionId, content, answeredBy]);
    return res.rows[0];
  }

  /**
   * Obtenir les réponses d'une question
   */
  static async getAnswersByQuestion(questionId, limit = 50, offset = 0) {
    const text = `
      SELECT a.id, a.question_id, a.content, a.answered_by, a.helpful_votes,
             a.is_marked_solution, a.created_at,
             u.first_name, u.last_name, u.profile_photo_url, u.points
      FROM forum_answers a
      JOIN users u ON a.answered_by = u.id
      WHERE a.question_id = $1
      ORDER BY a.is_marked_solution DESC, a.helpful_votes DESC, a.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    
    const res = await query(text, [questionId, limit, offset]);
    return res.rows;
  }

  /**
   * Voter sur une réponse
   */
  static async voteAnswer(answerId, votedBy, voteType) {
    const text = `
      INSERT INTO answer_votes (answer_id, voted_by, vote_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (answer_id, voted_by) DO UPDATE
      SET vote_type = $3
      RETURNING vote_type
    `;
    
    const res = await query(text, [answerId, votedBy, voteType]);
    
    // Mettre à jour le compteur de votes utiles
    await this.updateHelpfulVotes(answerId);
    
    return res.rows[0];
  }

  /**
   * Mettre à jour les votes utiles
   */
  static async updateHelpfulVotes(answerId) {
    const text = `
      UPDATE forum_answers
      SET helpful_votes = (
        SELECT COUNT(*) FROM answer_votes 
        WHERE answer_id = $1 AND vote_type = 'up'
      )
      WHERE id = $1
    `;
    
    await query(text, [answerId]);
  }

  /**
   * Marquer une réponse comme solution
   */
  static async markAsSolution(answerId) {
    const text = `
      UPDATE forum_answers
      SET is_marked_solution = true
      WHERE id = $1
      RETURNING is_marked_solution
    `;
    
    const res = await query(text, [answerId]);
    return res.rows[0];
  }

  /**
   * Obtenir les réponses d'un utilisateur
   */
  static async getUserAnswers(userId, limit = 20, offset = 0) {
    const text = `
      SELECT a.id, a.question_id, a.content, a.helpful_votes, 
             a.is_marked_solution, a.created_at,
             q.title as question_title
      FROM forum_answers a
      JOIN forum_questions q ON a.question_id = q.id
      WHERE a.answered_by = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const res = await query(text, [userId, limit, offset]);
    return res.rows;
  }
}

module.exports = ForumAnswer;
