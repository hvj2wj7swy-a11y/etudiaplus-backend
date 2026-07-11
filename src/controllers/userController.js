/**
 * Contrôleur pour la gestion des utilisateurs
 */

const User = require('../models/User');

class UserController {
  /**
   * Obtenir le profil utilisateur
   */
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Erreur obtention profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du profil'
      });
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateProfile(req, res) {
    try {
      const { firstName, lastName, school, program, session, profilePhotoUrl } = req.body;

      const updatedUser = await User.updateProfile(req.user.id, {
        firstName,
        lastName,
        school,
        program,
        session,
        profilePhotoUrl
      });

      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: { user: updatedUser }
      });
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du profil'
      });
    }
  }

  /**
   * Obtenir les meilleurs contributeurs
   */
  static async getTopContributors(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      
      const contributors = await User.getTopContributors(limit);

      res.json({
        success: true,
        data: { contributors }
      });
    } catch (error) {
      console.error('Erreur meilleurs contributeurs:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des meilleurs contributeurs'
      });
    }
  }

  /**
   * Obtenir les informations publiques d'un utilisateur
   */
  static async getPublicProfile(req, res) {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Ne retourner que les informations publiques
      const { email, ...publicUser } = user;

      res.json({
        success: true,
        data: { user: publicUser }
      });
    } catch (error) {
      console.error('Erreur profil public:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du profil'
      });
    }
  }
}

module.exports = UserController;
