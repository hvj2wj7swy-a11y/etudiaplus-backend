/**
 * Contrôleur des signalements
 */

const Report = require('../models/Report')

class ReportController {

  /**
 * Créer un signalement
 */
static async createReport(req, res) {
  try {
    const {
      contentType,
      contentId,
      reason,
      description
    } = req.body

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Informations manquantes.'
      })
    }

    const report = await Report.create({
      contentType,
      contentId,
      reason,
      description,
      reportedBy: req.user.id
    })

    return res.status(201).json({
      success: true,
      message: 'Signalement créé.',
      data: {
        report
      }
    })
  } catch (error) {
    console.error('Erreur création signalement :', error)

    return res.status(500).json({
      success: false,
      message: 'Impossible de créer le signalement.'
    })
  }
}

  /**
   * Obtenir tous les signalements
   * Administrateur uniquement
   */
  static async getAllReports(req, res) {
    try {
      const reports = await Report.getAll()

      return res.json({
        success: true,
        data: {
          reports
        }
      })
    } catch (error) {
      console.error('Erreur récupération signalements :', error)

      return res.status(500).json({
        success: false,
        message: 'Impossible de récupérer les signalements.'
      })
    }
  }

  /**
   * Ignorer un signalement
   */
  static async ignoreReport(req, res) {
    try {
      const reportId = Number(req.params.id)

      const report = await Report.updateStatus(reportId, 'ignored')

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Signalement introuvable.'
        })
      }

      return res.json({
        success: true,
        message: 'Signalement ignoré.',
        data: {
          report
        }
      })
    } catch (error) {
      console.error('Erreur ignore report :', error)

      return res.status(500).json({
        success: false,
        message: 'Impossible de modifier le signalement.'
      })
    }
  }

  /**
   * Résoudre un signalement
   */
  static async resolveReport(req, res) {
    try {
      const reportId = Number(req.params.id)

      const report = await Report.updateStatus(reportId, 'resolved')

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Signalement introuvable.'
        })
      }

      return res.json({
        success: true,
        message: 'Signalement résolu.',
        data: {
          report
        }
      })
    } catch (error) {
      console.error('Erreur resolve report :', error)

      return res.status(500).json({
        success: false,
        message: 'Impossible de modifier le signalement.'
      })
    }
  }
}

module.exports = ReportController