/**
 * Modèle Report - Gestion des signalements
 */

const { query } = require('../config/database')

class Report {
  /**
   * Créer un signalement
   */
  static async create(reportData) {
    const {
      contentType,
      contentId,
      reason,
      description,
      reportedBy
    } = reportData

    const text = `
      INSERT INTO document_reports (
        content_type,
        content_id,
        reported_by,
        reason,
        description,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING
        id,
        content_type,
        content_id,
        reported_by,
        reason,
        description,
        status,
        created_at
    `

    const res = await query(text, [
      contentType,
      contentId,
      reportedBy,
      reason,
      description || null
    ])

    return res.rows[0]
  }

  /**
   * Obtenir tous les signalements
   */
  static async getAll() {
  const text = `
    SELECT
      r.id,
      COALESCE(
        r.content_type,
        'document'
      ) AS content_type,

      COALESCE(
        r.content_id,
        r.document_id
      ) AS content_id,

      r.document_id,
      r.reported_by,
      r.reason,
      r.description,
      r.status,
      r.created_at,

      -- Personne qui a fait le signalement
      reporter.first_name,
      reporter.last_name,

      -- Document signalé
      d.title AS document_title,
      d.description AS document_description,
      d.file_url AS document_file_url,
      document_author.first_name
        AS document_author_first_name,
      document_author.last_name
        AS document_author_last_name,

      -- Question signalée
      q.title AS question_title,
      q.content AS question_content,
      question_author.first_name
        AS question_author_first_name,
      question_author.last_name
        AS question_author_last_name,

      -- Réponse signalée
      a.content AS answer_content,
      answer_author.first_name
        AS answer_author_first_name,
      answer_author.last_name
        AS answer_author_last_name,

      -- Question à laquelle appartient une réponse
      answer_question.title
        AS answer_question_title

    FROM document_reports r

    JOIN users reporter
      ON reporter.id = r.reported_by

    -- Document
    LEFT JOIN documents d
      ON d.id = COALESCE(
        r.content_id,
        r.document_id
      )
      AND COALESCE(
        r.content_type,
        'document'
      ) = 'document'

    LEFT JOIN users document_author
      ON document_author.id = d.uploaded_by

    -- Question forum
    LEFT JOIN forum_questions q
      ON q.id = r.content_id
      AND r.content_type = 'question'

    LEFT JOIN users question_author
      ON question_author.id = q.asked_by

    -- Réponse forum
    LEFT JOIN forum_answers a
      ON a.id = r.content_id
      AND r.content_type = 'answer'

    LEFT JOIN users answer_author
      ON answer_author.id = a.answered_by

    LEFT JOIN forum_questions answer_question
      ON answer_question.id = a.question_id

    ORDER BY r.created_at DESC
  `

  const res = await query(text)

  return res.rows
}

  /**
   * Modifier le statut d’un signalement
   */
  static async updateStatus(reportId, status) {
    const text = `
      UPDATE document_reports
      SET status = $2
      WHERE id = $1
      RETURNING
        id,
        COALESCE(content_type, 'document') AS content_type,
        COALESCE(content_id, document_id) AS content_id,
        document_id,
        reported_by,
        reason,
        description,
        status,
        created_at
    `

    const res = await query(text, [reportId, status])
    return res.rows[0] || null
  }
}

module.exports = Report