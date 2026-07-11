/**
 * Contrôleur pour le tableau de bord
 */

const { query } = require('../config/database');
const Document = require('../models/Document');
const ForumQuestion = require('../models/ForumQuestion');
const User = require('../models/User');

class DashboardController {
  /**
   * Obtenir les données du tableau de bord
   */
  static async getDashboard(req, res) {
    try {
      // Documents récemment ajoutés
      const recentDocuments = await Document.getAll(
        { status: 'approved' },
        5,
        0
      );

      // Questions récentes du forum
      const recentQuestions = await ForumQuestion.getAll(
        { isResolved: false },
        5,
        0
      );

      // Statistiques de l'utilisateur
      const userStats = await query(
        `SELECT documents_uploaded, documents_approved, questions_asked, 
                answers_provided, helpful_answers
         FROM user_statistics WHERE user_id = $1`,
        [req.user.id]
      );

      const stats = userStats.rows[0] || {
        documents_uploaded: 0,
        documents_approved: 0,
        questions_asked: 0,
        answers_provided: 0,
        helpful_answers: 0
      };

      // Points de l'utilisateur
      const userInfo = await User.findById(req.user.id);
      const points = userInfo?.points || 0;

      // Meilleurs contributeurs
      const topContributors = await User.getTopContributors(5);

      res.json({
        success: true,
        data: {
          recentDocuments,
          recentQuestions,
          userStatistics: stats,
          points,
          topContributors
        }
      });
    } catch (error) {
      console.error('Erreur tableau de bord:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du tableau de bord'
      });
    }
  }

  /**
   * Obtenir les statistiques détaillées de l'utilisateur
   */
  static async getUserStatistics(req, res) {
    try {
      const userId = parseInt(req.params.userId || req.user.id);

      const stats = await query(
        `SELECT u.points, u.created_at, us.*
         FROM users u
         LEFT JOIN user_statistics us ON u.id = us.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (stats.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        data: { statistics: stats.rows[0] }
      });
    } catch (error) {
      console.error('Erreur statistiques utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }
}

module.exports = DashboardController;
