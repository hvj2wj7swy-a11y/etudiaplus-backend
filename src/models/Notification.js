const { query } = require('../config/database')

class Notification {
  static async create({
    userId,
    type,
    title,
    message,
    link = null,
    metadata = null
  }) {
    const result = await query(
      `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING
          id,
          user_id,
          type,
          title,
          message,
          link,
          metadata,
          is_read,
          created_at,
          read_at
      `,
      [
        userId,
        type,
        title,
        message,
        link,
        metadata ? JSON.stringify(metadata) : null
      ]
    )

    return result.rows[0]
  }

  static async listByUser(userId, limit = 50) {
    const result = await query(
      `
        SELECT
          id,
          user_id,
          type,
          title,
          message,
          link,
          metadata,
          is_read,
          created_at,
          read_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userId, limit]
    )

    return result.rows
  }

  static async countUnread(userId) {
    const result = await query(
      `
        SELECT COUNT(*)::INT AS count
        FROM notifications
        WHERE user_id = $1
          AND is_read = false
      `,
      [userId]
    )

    return result.rows[0]?.count || 0
  }

  static async markAsRead(userId, notificationId) {
    const result = await query(
      `
        UPDATE notifications
        SET
          is_read = true,
          read_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND user_id = $2
        RETURNING
          id,
          user_id,
          type,
          title,
          message,
          link,
          metadata,
          is_read,
          created_at,
          read_at
      `,
      [notificationId, userId]
    )

    return result.rows[0] || null
  }

  static async markAllAsRead(userId) {
    await query(
      `
        UPDATE notifications
        SET
          is_read = true,
          read_at = COALESCE(
            read_at,
            CURRENT_TIMESTAMP
          )
        WHERE user_id = $1
          AND is_read = false
      `,
      [userId]
    )

    return this.listByUser(userId)
  }

  static async delete(userId, notificationId) {
    const result = await query(
      `
        DELETE FROM notifications
        WHERE id = $1
          AND user_id = $2
        RETURNING id
      `,
      [notificationId, userId]
    )

    return result.rows[0] || null
  }

static async agendaReminderExists(
  userId,
  eventId,
  reminderType
) {
  const result = await query(
    `
    SELECT id
    FROM notifications
    WHERE user_id = $1
      AND type = 'agenda'
      AND metadata->>'eventId' = $2
      AND metadata->>'reminderType' = $3
    LIMIT 1
    `,
    [
      userId,
      String(eventId),
      reminderType
    ]
  )

  return result.rowCount > 0
}
}

module.exports = Notification