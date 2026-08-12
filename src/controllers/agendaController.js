const AgendaEvent = require('../models/AgendaEvent');
const Notification = require('../models/Notification');

const createAgendaReminders = async (userId, events) => {
  const now = Date.now();

  for (const event of events) {
    if (
      !event.event_date ||
      !event.start_time
    ) {
      continue;
    }

    const date = String(
      event.event_date
    ).slice(0, 10);

    const time = String(
      event.start_time
    ).slice(0, 5);

    const startAt = new Date(
      `${date}T${time}:00`
    );

    const startTimestamp =
      startAt.getTime();

    if (
      Number.isNaN(startTimestamp) ||
      startTimestamp <= now
    ) {
      continue;
    }

    // Nouveaux rappels multiples
    let reminders = Array.isArray(
      event.reminder_minutes_list
    )
      ? event.reminder_minutes_list
      : [];

    // Compatibilité avec les anciens événements
    if (
      reminders.length === 0 &&
      event.reminder_minutes !== null &&
      event.reminder_minutes !== undefined
    ) {
      reminders = [
        Number(event.reminder_minutes)
      ];
    }

    // Nettoyage + suppression des doublons
    reminders = [
      ...new Set(
        reminders
          .map(Number)
          .filter(
            (minutes) =>
              Number.isFinite(minutes) &&
              minutes > 0
          )
      )
    ];

    for (const reminderMinutes of reminders) {
      const reminderMilliseconds =
        reminderMinutes * 60 * 1000;

      const reminderAt =
        startTimestamp -
        reminderMilliseconds;

      // Le moment du rappel n'est pas encore arrivé
      if (now < reminderAt) {
        continue;
      }

      const reminderType =
        `${reminderMinutes}min`;

      const exists =
        await Notification.agendaReminderExists(
          userId,
          event.id,
          reminderType
        );

      if (exists) {
        continue;
      }

      let reminderLabel =
        `${reminderMinutes} minutes`;

      if (reminderMinutes === 60) {
        reminderLabel = '1 heure';
      } else if (
        reminderMinutes === 1440
      ) {
        reminderLabel = '1 jour';
      } else if (
        reminderMinutes === 4320
      ) {
        reminderLabel = '3 jours';
      } else if (
        reminderMinutes === 10080
      ) {
        reminderLabel = '1 semaine';
      }

      await Notification.create({
        userId,
        type: 'agenda',
        title: 'Rappel agenda',
        message:
          `${event.title} commence le ${date} à ${time}. ` +
          `Rappel programmé ${reminderLabel} avant.`,
        link: '/agenda',
        metadata: {
          eventId: event.id,
          reminderType,
          reminderMinutes
        }
      });
    }
  }
};

class AgendaController {

  static async list(req, res) {
    try {
      const events =
        await AgendaEvent.getAll(
          req.user.id
        );

      await createAgendaReminders(
        req.user.id,
        events
      );

      return res.json({
        success: true,
        data: { events }
      });
    } catch (error) {
      console.error(
        'Erreur récupération agenda:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la récupération de l’agenda'
      });
    }
  }

  static async create(req, res) {
    try {
      const {
  title,
  type,
  date,
  startTime,
  endTime,
  course,
  room,
  description,
  color,
  recurrenceType,
  recurrenceEndDate,
reminderMinutes,
reminderMinutesList,
priority,
status
} = req.body;

      if (
        !title ||
        !date ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Titre, date, heure de début et heure de fin requis'
        });
      }

      const recurrence =
        recurrenceType || 'none';

      if (
        recurrence !== 'none' &&
        !recurrenceEndDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Une date de fin est requise pour un événement récurrent.'
        });
      }

      const events =
        await AgendaEvent.createRecurringSeries({
          userId: req.user.id,
          title,
          type: type || 'cours',
          eventDate: date,
          startTime,
          endTime,
          course: course || null,
          room: room || null,
          description: description || null,
          color: color || null,
          recurrenceType: recurrence,
recurrenceEndDate:
  recurrenceEndDate || null,
reminderMinutes:
  reminderMinutes === null ||
  reminderMinutes === undefined ||
  reminderMinutes === ''
    ? null
    : Number(reminderMinutes),

reminderMinutesList:
  Array.isArray(reminderMinutesList)
    ? reminderMinutesList.map(Number)
    : [],

priority:
  priority || 'normal',

status:
  status || 'todo'
        });

      return res.status(201).json({
        success: true,
        data: {
          event: events[0],
          events
        }
      });
    } catch (error) {
      console.error(
        'Erreur création événement agenda:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Erreur lors de la création de l’événement'
      });
    }
  }

  static async update(req, res) {
    try {
      const eventId =
        Number(req.params.id);

      const {
  title,
  type,
  date,
  startTime,
  endTime,
  course,
  room,
  description,
  color,
  recurrenceType,
  recurrenceEndDate,
reminderMinutes,
reminderMinutesList,
priority,
status
} = req.body;

      if (
        !title ||
        !date ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Titre, date, heure de début et heure de fin requis'
        });
      }

      const event =
        await AgendaEvent.update(
          eventId,
          req.user.id,
          {
            title,
            type: type || 'cours',
            eventDate: date,
            startTime,
            endTime,
            course: course || null,
            room: room || null,
            description:
              description || null,
            color: color || null,
            recurrenceType:
  recurrenceType || 'none',

recurrenceEndDate:
  recurrenceEndDate || null,

reminderMinutes:
  reminderMinutes === null ||
  reminderMinutes === undefined ||
  reminderMinutes === ''
    ? null
    : Number(reminderMinutes),

reminderMinutesList:
  Array.isArray(reminderMinutesList)
    ? reminderMinutesList.map(Number)
    : [],

priority:
  priority || 'normal',

status:
  status || 'todo'
          }
        );

      if (!event) {
        return res.status(404).json({
          success: false,
          message:
            'Événement introuvable'
        });
      }

      return res.json({
        success: true,
        data: { event }
      });
    } catch (error) {
      console.error(
        'Erreur modification événement agenda:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la modification de l’événement'
      });
    }
  }

  static async removeSeries(req, res) {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de série requis'
      });
    }

    const deletedEvents =
      await AgendaEvent.deleteSeries(
        req.user.id,
        groupId
      );

    if (!deletedEvents.length) {
      return res.status(404).json({
        success: false,
        message: 'Série introuvable'
      });
    }

    return res.json({
      success: true,
      message: 'Série supprimée',
      data: {
        deletedCount: deletedEvents.length
      }
    });
  } catch (error) {
    console.error(
      'Erreur suppression série agenda:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la suppression de la série'
    });
  }
}

  static async remove(req, res) {
    try {
      const eventId =
        Number(req.params.id);

      await AgendaEvent.delete(
        eventId,
        req.user.id
      );

      return res.json({
        success: true,
        message:
          'Événement supprimé'
      });
    } catch (error) {
      console.error(
        'Erreur suppression événement agenda:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la suppression de l’événement'
      });
    }
  }
}

module.exports = AgendaController;