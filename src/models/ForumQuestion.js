/**
 * Modèle ForumQuestion - Gestion des questions du forum
 */

const { query } = require('../config/database');

class ForumQuestion {
  /**
   * Créer une nouvelle question
   */
  static async create(questionData) {
    const { title, content, category, askedBy } = questionData;
    
    const text = `
      INSERT INTO forum_questions (title, content, category, asked_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, content, category, asked_by, view_count, created_at
    `;
    
    const res = await query(text, [title, content, category, askedBy]);
    return res.rows[0];
  }

  /**
   * Obtenir toutes les questions avec filtres
   */
  static async getAll(filters = {}, limit = 20, offset = 0) {
    let text = `
      SELECT q.id, q.title, q.content, q.category, q.asked_by, q.view_count,
             q.created_at, q.is_resolved,
             u.first_name, u.last_name, u.profile_photo_url,
             COUNT(a.id) as answer_count
      FROM forum_questions q
      JOIN users u ON q.asked_by = u.id
      LEFT JOIN forum_answers a ON q.id = a.question_id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (filters.category) {
      paramCount++;
      text += ` AND q.category = $${paramCount}`;
      values.push(filters.category);
    }
    
    if (filters.search) {
      paramCount++;
      text += ` AND (q.title ILIKE $${paramCount} OR q.content ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }
    
    if (filters.isResolved !== undefined) {
      paramCount++;
      text += ` AND q.is_resolved = $${paramCount}`;
      values.push(filters.isResolved);
    }
    
    text += ` GROUP BY q.id, u.id`;
    text += ` ORDER BY q.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Obtenir une question par ID
   */
  static async findById(id) {
    const text = `
      SELECT q.id, q.title, q.content, q.category, q.asked_by, q.view_count,
             q.created_at, q.is_resolved,
             u.first_name, u.last_name, u.profile_photo_url
      FROM forum_questions q
      JOIN users u ON q.asked_by = u.id
      WHERE q.id = $1
    `;
    
    const res = await query(text, [id]);
    return res.rows[0];
  }

  /**
   * Incrémenter le compteur de vues
   */
  static async incrementViewCount(id) {
    const text = `
      UPDATE forum_questions
      SET view_count = view_count + 1
      WHERE id = $1
      RETURNING view_count
    `;
    
    const res = await query(text, [id]);
    return res.rows[0];
  }

  /**
   * Marquer une question comme résolue
   */
  static async markAsResolved(id) {
    const text = `
      UPDATE forum_questions
      SET is_resolved = true
      WHERE id = $1
      RETURNING is_resolved
    `;
    
    const res = await query(text, [id]);
    return res.rows[0];
  }
}

module.exports = ForumQuestion;
