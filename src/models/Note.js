const { pool, query } = require('../config/database');

class Note {
  /**
   * Obtenir les cahiers d'un utilisateur
   */
  static async listByUser(userId, filters = {}) {
    let text = `
      SELECT
        n.id,
        n.title,
        n.course_name,
        n.folder_name,
        n.color,
        n.is_favorite,
        n.is_trashed,
        n.source_pdf,
        n.created_at,
        n.updated_at,
        n.last_opened_at,
        COUNT(p.id)::INT AS page_count,
        COALESCE(MAX(p.preview_text), '') AS preview_text
      FROM notebooks n
      LEFT JOIN note_pages p
        ON p.notebook_id = n.id
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

      text += `
        AND (
          n.title ILIKE $${paramIndex}
          OR n.course_name ILIKE $${paramIndex}
          OR n.folder_name ILIKE $${paramIndex}
          OR COALESCE(p.preview_text, '') ILIKE $${paramIndex}
        )
      `;

      values.push(`%${filters.search}%`);
    }

    text += `
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `;

    const result = await query(text, values);
    return result.rows;
  }

  /**
   * Créer un cahier
   */
  static async createNotebook({
    userId,
    title,
    courseName,
    folderName = 'Sans dossier',
    color,
    sheetType = 'lined',
    sourcePdf = null
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const notebookResult = await client.query(
        `
          INSERT INTO notebooks (
            user_id,
            title,
            course_name,
            folder_name,
            color,
            source_pdf
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          RETURNING
            id,
            user_id,
            title,
            course_name,
            folder_name,
            color,
            is_favorite,
            is_trashed,
            source_pdf,
            created_at,
            updated_at,
            last_opened_at
        `,
        [
          userId,
          title,
          courseName,
          folderName || 'Sans dossier',
          color || '#0d6efd',
          sourcePdf ? JSON.stringify(sourcePdf) : null
        ]
      );

      const notebook = notebookResult.rows[0];

      const pageResult = await client.query(
        `
          INSERT INTO note_pages (
            notebook_id,
            title,
            page_order,
            sheet_type,
            preview_text,
            background
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          RETURNING
            id,
            notebook_id,
            title,
            page_order,
            sheet_type,
            preview_text,
            background,
            created_at,
            updated_at
        `,
        [
          notebook.id,
          'Page 1',
          1,
          sheetType,
          '',
          null
        ]
      );

      await client.query('COMMIT');

      return {
        ...notebook,
        pages: [
          {
            ...pageResult.rows[0],
            elements: []
          }
        ]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtenir un cahier complet
   */
  static async findNotebookById(userId, notebookId) {
    const notebookResult = await query(
      `
        SELECT
          id,
          user_id,
          title,
          course_name,
          folder_name,
          color,
          is_favorite,
          is_trashed,
          source_pdf,
          created_at,
          updated_at,
          last_opened_at
        FROM notebooks
        WHERE id = $1
          AND user_id = $2
      `,
      [notebookId, userId]
    );

    const notebook = notebookResult.rows[0];

    if (!notebook) {
      return null;
    }

    const pagesResult = await query(
      `
        SELECT
          p.id,
          p.notebook_id,
          p.title,
          p.page_order,
          p.sheet_type,
          p.preview_text,
          p.background,
          p.created_at,
          p.updated_at,

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
            )
            FILTER (WHERE e.id IS NOT NULL),
            '[]'::json
          ) AS elements

        FROM note_pages p

        LEFT JOIN note_elements e
          ON e.page_id = p.id

        WHERE p.notebook_id = $1

        GROUP BY p.id

        ORDER BY
          p.page_order ASC,
          p.id ASC
      `,
      [notebookId]
    );

    return {
      ...notebook,
      pages: pagesResult.rows
    };
  }

  /**
   * Modifier les informations d'un cahier
   */
  static async updateNotebook(
    userId,
    notebookId,
    updates
  ) {
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

    if (typeof updates.folderName === 'string') {
      paramIndex += 1;
      fields.push(`folder_name = $${paramIndex}`);
      values.push(
        updates.folderName.trim() || 'Sans dossier'
      );
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

    if (updates.sourcePdf !== undefined) {
      paramIndex += 1;
      fields.push(`source_pdf = $${paramIndex}::jsonb`);

      values.push(
        updates.sourcePdf
          ? JSON.stringify(updates.sourcePdf)
          : null
      );
    }

    if (fields.length === 0) {
      return this.findNotebookById(
        userId,
        notebookId
      );
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
        SET
          ${fields.join(', ')},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $${notebookParam}
          AND user_id = $${userParam}
        RETURNING id
      `,
      values
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.findNotebookById(
      userId,
      notebookId
    );
  }

  /**
   * Créer une nouvelle page
   */
  static async createPage(
    userId,
    notebookId,
    {
      title,
      sheetType,
      background = null
    }
  ) {
    const ownershipResult = await query(
      `
        SELECT id
        FROM notebooks
        WHERE id = $1
          AND user_id = $2
      `,
      [notebookId, userId]
    );

    if (ownershipResult.rowCount === 0) {
      return null;
    }

    const orderResult = await query(
      `
        SELECT
          COALESCE(MAX(page_order), 0)::INT AS max_order
        FROM note_pages
        WHERE notebook_id = $1
      `,
      [notebookId]
    );

    const nextOrder =
      (orderResult.rows[0]?.max_order || 0) + 1;

    const pageResult = await query(
      `
        INSERT INTO note_pages (
          notebook_id,
          title,
          page_order,
          sheet_type,
          preview_text,
          background
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING
          id,
          notebook_id,
          title,
          page_order,
          sheet_type,
          preview_text,
          background,
          created_at,
          updated_at
      `,
      [
        notebookId,
        title || `Page ${nextOrder}`,
        nextOrder,
        sheetType || 'lined',
        '',
        background
          ? JSON.stringify(background)
          : null
      ]
    );

    await query(
      `
        UPDATE notebooks
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [notebookId]
    );

    return {
      ...pageResult.rows[0],
      elements: []
    };
  }

  /**
   * Modifier et sauvegarder une page
   */
  static async updatePage(
    userId,
    notebookId,
    pageId,
    payload
  ) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pageOwner = await client.query(
        `
          SELECT p.id
          FROM note_pages p
          JOIN notebooks n
            ON n.id = p.notebook_id
          WHERE p.id = $1
            AND p.notebook_id = $2
            AND n.user_id = $3
        `,
        [
          pageId,
          notebookId,
          userId
        ]
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

      if (payload.background !== undefined) {
        paramIndex += 1;
        fields.push(
          `background = $${paramIndex}::jsonb`
        );

        values.push(
          payload.background
            ? JSON.stringify(payload.background)
            : null
        );
      }

      /*
       * Les éléments du cahier :
       * texte, stylet, formes, images, etc.
       */
      if (Array.isArray(payload.elements)) {
        await client.query(
          `
            DELETE FROM note_elements
            WHERE page_id = $1
          `,
          [pageId]
        );

        for (
          let index = 0;
          index < payload.elements.length;
          index += 1
        ) {
          const element =
            payload.elements[index];

          await client.query(
            `
              INSERT INTO note_elements (
                page_id,
                element_type,
                element_data,
                z_index
              )
              VALUES ($1, $2, $3::jsonb, $4)
            `,
            [
              pageId,
              element.type || 'unknown',
              JSON.stringify(element),
              index
            ]
          );
        }
      }

      if (fields.length > 0) {
        values.push(pageId);

        await client.query(
          `
            UPDATE note_pages
            SET
              ${fields.join(', ')},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $${values.length}
          `,
          values
        );
      } else {
        await client.query(
          `
            UPDATE note_pages
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [pageId]
        );
      }

      await client.query(
        `
          UPDATE notebooks
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [notebookId]
      );

      await client.query('COMMIT');

      return this.findNotebookById(
        userId,
        notebookId
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  /**
 * Lister les dossiers d'un utilisateur
 */
static async listFolders(userId) {
  const result = await query(
    `
      SELECT id, name, created_at, updated_at
      FROM notebook_folders
      WHERE user_id = $1
      ORDER BY name ASC
    `,
    [userId]
  );

  return result.rows;
}

/**
 * Créer un dossier
 */
static async createFolder(userId, name) {
  const normalizedName =
    String(name || '').trim();

  if (!normalizedName) {
    return null;
  }

  const result = await query(
    `
      INSERT INTO notebook_folders (
        user_id,
        name
      )
      VALUES ($1, $2)
      ON CONFLICT (user_id, name)
      DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        id,
        name,
        created_at,
        updated_at
    `,
    [userId, normalizedName]
  );

  return result.rows[0] || null;
}

/**
 * Renommer un dossier
 */
static async renameFolder(
  userId,
  sourceFolderName,
  targetFolderName
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const source =
      String(sourceFolderName || '').trim();

    const target =
      String(targetFolderName || '').trim();

    if (!source || !target) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `
        INSERT INTO notebook_folders (
          user_id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (user_id, name)
        DO NOTHING
      `,
      [userId, target]
    );

    await client.query(
      `
        UPDATE notebooks
        SET
          folder_name = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND folder_name = $2
      `,
      [userId, source, target]
    );

    await client.query(
      `
        DELETE FROM notebook_folders
        WHERE user_id = $1
          AND name = $2
      `,
      [userId, source]
    );

    await client.query('COMMIT');

    const result = await query(
      `
        SELECT id, name, created_at, updated_at
        FROM notebook_folders
        WHERE user_id = $1
        ORDER BY name ASC
      `,
      [userId]
    );

    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Supprimer un dossier et déplacer ses cahiers
 */
static async deleteFolder(
  userId,
  folderName,
  targetFolderName
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const source =
      String(folderName || '').trim();

    const target =
      String(targetFolderName || '').trim();

    if (!source || !target || source === target) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `
        INSERT INTO notebook_folders (
          user_id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (user_id, name)
        DO NOTHING
      `,
      [userId, target]
    );

    await client.query(
      `
        UPDATE notebooks
        SET
          folder_name = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND folder_name = $2
      `,
      [userId, source, target]
    );

    await client.query(
      `
        DELETE FROM notebook_folders
        WHERE user_id = $1
          AND name = $2
      `,
      [userId, source]
    );

    await client.query('COMMIT');

    const result = await query(
      `
        SELECT id, name, created_at, updated_at
        FROM notebook_folders
        WHERE user_id = $1
        ORDER BY name ASC
      `,
      [userId]
    );

    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

  static async deletePage(userId, notebookId, pageId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const check = await client.query(
      `
      SELECT p.id
      FROM note_pages p
      JOIN notebooks n
        ON n.id = p.notebook_id
      WHERE
        p.id = $1
        AND p.notebook_id = $2
        AND n.user_id = $3
      `,
      [pageId, notebookId, userId]
    );

    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `
      DELETE FROM note_pages
      WHERE id = $1
      `,
      [pageId]
    );

    await client.query(
      `
      UPDATE notebooks
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [notebookId]
    );

    await client.query('COMMIT');

    return this.findNotebookById(userId, notebookId);

  } catch (err) {

    await client.query('ROLLBACK');
    throw err;

  } finally {

    client.release();

  }
}

}


module.exports = Note;