const { pool, query } = require('../config/database');

class Note {
  static async listByUser(userId, filters = {}) {
    let text = `
      SELECT n.id, n.title, n.course_name, n.color, n.is_favorite, n.is_trashed,
             n.created_at, n.updated_at, n.last_opened_at,
             COUNT(p.id)::INT AS page_count,
             COALESCE(MAX(p.preview_text), '') AS preview_text
      FROM notebooks n
      LEFT JOIN note_pages p ON p.notebook_id = n.id
      WHERE n.user_id = $1
    `;

    const values = [userId];
    let paramIndex = 1;

    if (typeof filters.isTrashed === 'boolean') {
      paramIndex += 1;
      text += ` AND n.is_trashed = $${paramIndex}`;
      values.push(filters.isTrashed);
    }

    if (typeof filters.isFavorite === 'boolean') {
      paramIndex += 1;
      text += ` AND n.is_favorite = $${paramIndex}`;
      values.push(filters.isFavorite);
    }

    if (filters.search) {
      paramIndex += 1;
      text += ` AND (n.title ILIKE $${paramIndex} OR n.course_name ILIKE $${paramIndex} OR COALESCE(p.preview_text, '') ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
    }

    text += `
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `;

    const result = await query(text, values);
    return result.rows;
  }

  static async createNotebook({ userId, title, courseName, color, sheetType = 'lined' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const notebookResult = await client.query(
        `
          INSERT INTO notebooks (user_id, title, course_name, color)
          VALUES ($1, $2, $3, $4)
          RETURNING id, user_id, title, course_name, color, is_favorite, is_trashed, created_at, updated_at, last_opened_at
        `,
        [userId, title, courseName, color]
      );

      const notebook = notebookResult.rows[0];

      const pageResult = await client.query(
        `
          INSERT INTO note_pages (notebook_id, title, page_order, sheet_type, preview_text)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, notebook_id, title, page_order, sheet_type, preview_text, created_at, updated_at
        `,
        [notebook.id, 'Page 1', 1, sheetType, '']
      );

      await client.query('COMMIT');
      return { ...notebook, pages: [pageResult.rows[0]] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findNotebookById(userId, notebookId) {
    const notebookResult = await query(
      `
        SELECT id, user_id, title, course_name, color, is_favorite, is_trashed, created_at, updated_at, last_opened_at
        FROM notebooks
        WHERE id = $1 AND user_id = $2
      `,
      [notebookId, userId]
    );

    const notebook = notebookResult.rows[0];
    if (!notebook) return null;

    const pagesResult = await query(
      `
        SELECT p.id, p.notebook_id, p.title, p.page_order, p.sheet_type, p.preview_text, p.created_at, p.updated_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', e.id,
                     'type', e.element_type,
                     'zIndex', e.z_index,
                     'data', e.element_data,
                     'createdAt', e.created_at,
                     'updatedAt', e.updated_at
                   )
                   ORDER BY e.z_index, e.id
                 ) FILTER (WHERE e.id IS NOT NULL),
                 '[]'::json
               ) AS elements
        FROM note_pages p
        LEFT JOIN note_elements e ON e.page_id = p.id
        WHERE p.notebook_id = $1
        GROUP BY p.id
        ORDER BY p.page_order ASC, p.id ASC
      `,
      [notebookId]
    );

    return { ...notebook, pages: pagesResult.rows };
  }

  static async updateNotebook(userId, notebookId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 0;

    if (typeof updates.title === 'string') {
      paramIndex += 1;
      fields.push(`title = $${paramIndex}`);
      values.push(updates.title);
    }

    if (typeof updates.courseName === 'string') {
      paramIndex += 1;
      fields.push(`course_name = $${paramIndex}`);
      values.push(updates.courseName);
    }

    if (typeof updates.color === 'string') {
      paramIndex += 1;
      fields.push(`color = $${paramIndex}`);
      values.push(updates.color);
    }

    if (typeof updates.isFavorite === 'boolean') {
      paramIndex += 1;
      fields.push(`is_favorite = $${paramIndex}`);
      values.push(updates.isFavorite);
    }

    if (typeof updates.isTrashed === 'boolean') {
      paramIndex += 1;
      fields.push(`is_trashed = $${paramIndex}`);
      values.push(updates.isTrashed);
    }

    if (typeof updates.lastOpenedAt === 'string') {
      paramIndex += 1;
      fields.push(`last_opened_at = $${paramIndex}`);
      values.push(updates.lastOpenedAt);
    }

    if (fields.length === 0) {
      return this.findNotebookById(userId, notebookId);
    }

    paramIndex += 1;
    const notebookParam = paramIndex;
    values.push(notebookId);
    paramIndex += 1;
    const userParam = paramIndex;
    values.push(userId);

    const result = await query(
      `
        UPDATE notebooks
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${notebookParam} AND user_id = $${userParam}
        RETURNING id
      `,
      values
    );

    if (result.rowCount === 0) return null;
    return this.findNotebookById(userId, notebookId);
  }

  static async createPage(userId, notebookId, { title, sheetType }) {
    const ownershipResult = await query(
      'SELECT id FROM notebooks WHERE id = $1 AND user_id = $2',
      [notebookId, userId]
    );

    if (ownershipResult.rowCount === 0) return null;

    const orderResult = await query(
      'SELECT COALESCE(MAX(page_order), 0)::INT AS max_order FROM note_pages WHERE notebook_id = $1',
      [notebookId]
    );

    const nextOrder = (orderResult.rows[0]?.max_order || 0) + 1;

    const pageResult = await query(
      `
        INSERT INTO note_pages (notebook_id, title, page_order, sheet_type, preview_text)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, notebook_id, title, page_order, sheet_type, preview_text, created_at, updated_at
      `,
      [notebookId, title || `Page ${nextOrder}`, nextOrder, sheetType || 'lined', '']
    );

    await query('UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [notebookId]);
    return pageResult.rows[0];
  }

  static async updatePage(userId, notebookId, pageId, payload) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const pageOwner = await client.query(
        `
          SELECT p.id
          FROM note_pages p
          JOIN notebooks n ON n.id = p.notebook_id
          WHERE p.id = $1 AND p.notebook_id = $2 AND n.user_id = $3
        `,
        [pageId, notebookId, userId]
      );

      if (pageOwner.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const fields = [];
      const values = [];
      let paramIndex = 0;

      if (typeof payload.title === 'string') {
        paramIndex += 1;
        fields.push(`title = $${paramIndex}`);
        values.push(payload.title);
      }

      if (typeof payload.sheetType === 'string') {
        paramIndex += 1;
        fields.push(`sheet_type = $${paramIndex}`);
        values.push(payload.sheetType);
      }

      if (typeof payload.previewText === 'string') {
        paramIndex += 1;
        fields.push(`preview_text = $${paramIndex}`);
        values.push(payload.previewText);
      }

      if (Array.isArray(payload.elements)) {
        await client.query('DELETE FROM note_elements WHERE page_id = $1', [pageId]);

        for (let index = 0; index < payload.elements.length; index += 1) {
          const element = payload.elements[index];
          await client.query(
            `
              INSERT INTO note_elements (page_id, element_type, element_data, z_index)
              VALUES ($1, $2, $3::jsonb, $4)
            `,
            [pageId, element.type || 'unknown', JSON.stringify(element), index]
          );
        }
      }

      if (fields.length > 0) {
        values.push(pageId);
        await client.query(
          `
            UPDATE note_pages
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${values.length}
          `,
          values
        );
      } else {
        await client.query('UPDATE note_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [pageId]);
      }

      await client.query('UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [notebookId]);
      await client.query('COMMIT');
      return this.findNotebookById(userId, notebookId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Note;