const { query } = require('../config/database');
const crypto = require('crypto');

class AgendaEvent {

  static async getAll(userId) {
    const result = await query(
      `
      SELECT *
      FROM agenda_events
      WHERE user_id = $1
      ORDER BY event_date, start_time
      `,
      [userId]
    );

    return result.rows;
  }

  static async create(data) {
  const result = await query(
    `
    INSERT INTO agenda_events
    (
      user_id,
      title,
      type,
      event_date,
      start_time,
      end_time,
      course,
      room,
      description,
      color,
      recurrence_type,
      recurrence_end_date,
      recurrence_group_id,
      reminder_minutes,
      reminder_minutes_list,
priority,
status
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )
    RETURNING *
    `,
    [
      data.userId,
      data.title,
      data.type,
      data.eventDate,
      data.startTime,
      data.endTime,
      data.course,
      data.room,
      data.description,
      data.color,
      data.recurrenceType || 'none',
      data.recurrenceEndDate || null,
      data.recurrenceGroupId || null,
      data.reminderMinutes ?? null,
      JSON.stringify(data.reminderMinutesList || []),
      data.priority || 'normal',
      data.status || 'todo'
    ]
  );

  return result.rows[0];
}

  static async createRecurringSeries(data) {
    const recurrenceType =
      data.recurrenceType || 'none';

    if (recurrenceType === 'none') {
      return [
        await this.create({
          ...data,
          recurrenceType: 'none',
          recurrenceEndDate: null,
          recurrenceGroupId: null
        })
      ];
    }

    if (!data.recurrenceEndDate) {
      throw new Error(
        'Une date de fin est requise pour un événement récurrent.'
      );
    }

    const groupId =
      crypto.randomUUID();

    const startDate =
      new Date(`${data.eventDate}T12:00:00`);

    const endDate =
      new Date(
        `${data.recurrenceEndDate}T12:00:00`
      );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      throw new Error(
        'Date de récurrence invalide.'
      );
    }

    if (endDate < startDate) {
      throw new Error(
        'La date de fin de récurrence doit être après la date de début.'
      );
    }

    const createdEvents = [];

    let currentDate =
      new Date(startDate);

    while (currentDate <= endDate) {
      const eventDate =
        [
          currentDate.getFullYear(),
          String(
            currentDate.getMonth() + 1
          ).padStart(2, '0'),
          String(
            currentDate.getDate()
          ).padStart(2, '0')
        ].join('-');

      const created =
        await this.create({
          ...data,
          eventDate,
          recurrenceType,
          recurrenceEndDate:
            data.recurrenceEndDate,
          recurrenceGroupId: groupId
        });

      createdEvents.push(created);

      if (recurrenceType === 'weekly') {
        currentDate.setDate(
          currentDate.getDate() + 7
        );
      } else if (
        recurrenceType === 'biweekly'
      ) {
        currentDate.setDate(
          currentDate.getDate() + 14
        );
      } else if (
        recurrenceType === 'monthly'
      ) {
        currentDate.setMonth(
          currentDate.getMonth() + 1
        );
      } else {
        break;
      }
    }

    return createdEvents;
  }

  static async update(id, userId, data) {
  const result = await query(
    `
    UPDATE agenda_events
SET
  title=$1,
  type=$2,
  event_date=$3,
  start_time=$4,
  end_time=$5,
  course=$6,
  room=$7,
  description=$8,
  color=$9,
  recurrence_type=$10,
  recurrence_end_date=$11,
  reminder_minutes=$12,
reminder_minutes_list=$13,
priority=$14,
status=$15,
updated_at=CURRENT_TIMESTAMP
WHERE id=$16
  AND user_id=$17
RETURNING *
    `,
    [
  data.title,
  data.type,
  data.eventDate,
  data.startTime,
  data.endTime,
  data.course,
  data.room,
  data.description,
  data.color,
  data.recurrenceType || 'none',
  data.recurrenceEndDate || null,
  data.reminderMinutes ?? null,
JSON.stringify(data.reminderMinutesList || []),
data.priority || 'normal',
data.status || 'todo',
id,
userId
]
  );

  return result.rows[0] || null;
}

  static async delete(id, userId) {
    const result = await query(
      `
      DELETE FROM agenda_events
      WHERE id=$1
        AND user_id=$2
      RETURNING *
      `,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  static async deleteSeries(
    userId,
    recurrenceGroupId
  ) {
    const result = await query(
      `
      DELETE FROM agenda_events
      WHERE user_id=$1
        AND recurrence_group_id=$2
      RETURNING id
      `,
      [
        userId,
        recurrenceGroupId
      ]
    );

    return result.rows;
  }
}

module.exports = AgendaEvent;