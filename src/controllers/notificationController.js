const Notification = require('../models/Notification')

class NotificationController {
  static async list(req, res) {
    try {
      const limit = Math.min(
        Math.max(Number(req.query.limit) || 50, 1),
        100
      )

      const notifications =
        await Notification.listByUser(
          req.user.id,
          limit
        )

      return res.json({
        success: true,
        data: { notifications }
      })
    } catch (error) {
      console.error(
        'Erreur récupération notifications:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la récupération des notifications'
      })
    }
  }

  static async unreadCount(req, res) {
    try {
      const count =
        await Notification.countUnread(
          req.user.id
        )

      return res.json({
        success: true,
        data: { count }
      })
    } catch (error) {
      console.error(
        'Erreur compteur notifications:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors du chargement du compteur'
      })
    }
  }

  static async markAsRead(req, res) {
    try {
      const notification =
        await Notification.markAsRead(
          req.user.id,
          Number(req.params.id)
        )

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            'Notification introuvable'
        })
      }

      return res.json({
        success: true,
        data: { notification }
      })
    } catch (error) {
      console.error(
        'Erreur lecture notification:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la mise à jour de la notification'
      })
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const notifications =
        await Notification.markAllAsRead(
          req.user.id
        )

      return res.json({
        success: true,
        data: { notifications }
      })
    } catch (error) {
      console.error(
        'Erreur lecture notifications:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la mise à jour des notifications'
      })
    }
  }

  static async remove(req, res) {
    try {
      const deleted =
        await Notification.delete(
          req.user.id,
          Number(req.params.id)
        )

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            'Notification introuvable'
        })
      }

      return res.json({
        success: true,
        data: {
          id: deleted.id
        }
      })
    } catch (error) {
      console.error(
        'Erreur suppression notification:',
        error
      )

      return res.status(500).json({
        success: false,
        message:
          'Erreur lors de la suppression de la notification'
      })
    }
  }
}

module.exports = NotificationController