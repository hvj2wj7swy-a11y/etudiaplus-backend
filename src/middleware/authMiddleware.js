/**
 * Middleware d'authentification JWT
 */

const jwt = require('jsonwebtoken');

/**
 * Vérifier le token JWT dans la requête
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant. Veuillez vous authentifier.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
    req.user = user;
    next();
  });
};

/**
 * Vérifier les permissions d'administrateur
 */
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Accès refusé. Permissions administrateur requises.'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeAdmin
};
