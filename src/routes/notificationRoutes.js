const express = require('express')
const router = express.Router()

const notificationController =
  require('../controllers/notificationController')

const {
  authenticateToken
} = require('../middleware/authMiddleware')

router.use(authenticateToken)

router.get(
  '/',
  notificationController.list
)

router.get(
  '/unread-count',
  notificationController.unreadCount
)

router.patch(
  '/read-all',
  notificationController.markAllAsRead
)

router.patch(
  '/:id/read',
  notificationController.markAsRead
)

router.delete(
  '/:id',
  notificationController.remove
)

router.post('/test', async (req, res) => {
  try {
    const Notification = require('../models/Notification')

    const notification = await Notification.create({
      userId: req.user.id,
      type: 'info',
      title: 'Test Étudia+',
      message: 'Ceci est une notification de test.',
      link: '/notes'
    })

    res.status(201).json({
      success: true,
      data: { notification }
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Erreur création notification test'
    })
  }
})

module.exports = router