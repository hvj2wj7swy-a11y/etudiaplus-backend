/**
 * Contrôleur pour l'authentification
 */

const User = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');

const DEV_ADMIN_EMAIL = String(process.env.DEV_ADMIN_EMAIL || '').trim().toLowerCase();
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD || '';
const isDevelopment = process.env.NODE_ENV !== 'production';

const buildDevAdmin = () => ({
  id: 'dev-admin',
  email: DEV_ADMIN_EMAIL,
  first_name: 'Administrateur',
  last_name: 'Demo',
  role: 'admin',
  points: 0,
  created_at: new Date().toISOString(),
  is_active: true
});

class AuthController {
  /**
   * Inscription
   */
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName, school, program, session } = req.body;

      // Validation de base
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, mot de passe, prénom et nom requis'
        });
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findByEmail(normalizedEmail);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Un compte avec cet email existe déjà'
        });
      }

      // Créer l'utilisateur
      const newUser = await User.create({
        email: normalizedEmail,
        password,
        firstName,
        lastName,
        school,
        program,
        session
      });

      // Générer le token JWT
      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: {
          user: newUser,
          token
        }
      });
    } catch (error) {
      console.error('Erreur inscription:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'inscription'
      });
    }
  }

  /**
   * Connexion
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe requis'
        });
      }

      if (
        isDevelopment
        && DEV_ADMIN_EMAIL
        && DEV_ADMIN_PASSWORD
        && String(email || '').toLowerCase().trim() === DEV_ADMIN_EMAIL
      ) {
        if (password !== DEV_ADMIN_PASSWORD) {
          return res.status(401).json({
            success: false,
            message: 'Email ou mot de passe incorrect'
          });
        }

        const admin = buildDevAdmin();
        const token = generateToken({
          id: admin.id,
          email: admin.email,
          role: admin.role
        });

        return res.json({
          success: true,
          message: 'Connexion réussie',
          data: {
            user: admin,
            token
          }
        });
      }

      // Trouver l'utilisateur
      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await User.findByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Générer le token JWT
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const freshUser = await User.findById(user.id);

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: freshUser,
          token
        }
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion'
      });
    }
  }

  /**
   * Vérifier le token JWT
   */
  static async verifyToken(req, res) {
    try {
      if (isDevelopment && req.user?.id === 'dev-admin') {
        return res.json({
          success: true,
          data: { user: buildDevAdmin() }
        });
      }

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
      console.error('Erreur vérification token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification du token'
      });
    }
  }
}

module.exports = AuthController;
