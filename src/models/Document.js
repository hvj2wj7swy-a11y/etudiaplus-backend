/**
 * Modèle Document - Gestion des documents
 */

const { query } = require('../config/database');

class Document {
  /**
   * Créer un nouveau document
   */
  static async create(documentData) {
    const { title, description, fileUrl, fileSize, fileType, school, program, 
            courseCode, courseName, uploadedBy } = documentData;
    
    const text = `
      INSERT INTO documents (title, description, file_url, file_size, file_type, 
                            school, program, course_code, course_name, uploaded_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, title, description, file_url, school, program, course_code, 
                uploaded_by, status, created_at
    `;
    
    const res = await query(text, [title, description, fileUrl, fileSize, fileType, 
                                   school, program, courseCode, courseName, uploadedBy, 'pending']);
    return res.rows[0];
  }

  /**
   * Obtenir tous les documents avec filtres
   */
  static async getAll(filters = {}, limit = 20, offset = 0) {
    let text = `
      SELECT d.id, d.title, d.description, d.file_url, d.school, d.program, 
             d.course_code, d.course_name, d.uploaded_by, d.status, 
             d.download_count, d.average_rating, d.created_at,
             u.first_name, u.last_name, u.profile_photo_url
      FROM documents d
      JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (filters.status) {
      paramCount++;
      text += ` AND d.status = $${paramCount}`;
      values.push(filters.status);
    }
    
    if (filters.program) {
      paramCount++;
      text += ` AND d.program = $${paramCount}`;
      values.push(filters.program);
    }
    
    if (filters.courseCode) {
      paramCount++;
      text += ` AND d.course_code = $${paramCount}`;
      values.push(filters.courseCode);
    }
    
    if (filters.search) {
      paramCount++;
      text += ` AND (d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }
    
    text += ` ORDER BY d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Obtenir un document par ID
   */
  static async findById(id) {
    const text = `
      SELECT d.id, d.title, d.description, d.file_url, d.file_size, d.file_type,
             d.school, d.program, d.course_code, d.course_name, d.uploaded_by,
             d.status, d.download_count, d.average_rating, d.created_at,
             u.first_name, u.last_name, u.profile_photo_url
      FROM documents d
      JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1
    `;
    
    const res = await query(text, [id]);
    return res.rows[0];
  }

  /**
   * Augmenter le compteur de téléchargements
   */
  static async incrementDownloadCount(id) {
    const text = `
      UPDATE documents
      SET download_count = download_count + 1
      WHERE id = $1
      RETURNING download_count
    `;
    
    const res = await query(text, [id]);
    return res.rows[0];
  }

  /**
   * Approuver un document
   */
  static async approve(id) {
    const text = `
      UPDATE documents
      SET status = 'approved'
      WHERE id = $1
      RETURNING id
    `;
    
    await query(text, [id]);
  }

  /**
   * Rejeter un document
   */
  static async reject(id) {
    const text = `
      UPDATE documents
      SET status = 'rejected'
      WHERE id = $1
      RETURNING id
    `;
    
    await query(text, [id]);
  }

  /**
   * Ajouter une évaluation à un document
   */
  static async addRating(documentId, userId, rating, comment) {
    const text = `
      INSERT INTO document_ratings (document_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (document_id, user_id) DO UPDATE
      SET rating = $3, comment = $4, created_at = CURRENT_TIMESTAMP
      RETURNING rating
    `;
    
    const res = await query(text, [documentId, userId, rating, comment]);
    
    // Mettre à jour la moyenne
    await this.updateAverageRating(documentId);
    
    return res.rows[0];
  }

  /**
   * Mettre à jour la note moyenne
   */
  static async updateAverageRating(documentId) {
    const text = `
      UPDATE documents
      SET average_rating = (
        SELECT AVG(rating)::NUMERIC(3, 2) FROM document_ratings WHERE document_id = $1
      )
      WHERE id = $1
    `;
    
    await query(text, [documentId]);
  }

  /**
   * Signaler un document
   */
  static async reportDocument(documentId, reportedBy, reason, description) {
    const text = `
      INSERT INTO document_reports (document_id, reported_by, reason, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, status
    `;
    
    const res = await query(text, [documentId, reportedBy, reason, description]);
    return res.rows[0];
  }

  /**
   * Obtenir les documents d'un utilisateur
   */
  static async getUserDocuments(userId, limit = 20, offset = 0) {
    const text = `
      SELECT id, title, description, school, program, course_code, 
             status, download_count, average_rating, created_at
      FROM documents
      WHERE uploaded_by = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const res = await query(text, [userId, limit, offset]);
    return res.rows;
  }
}

module.exports = Document;
