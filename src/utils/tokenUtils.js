/**
 * Utilitaires pour la génération et vérification de tokens JWT
 */

const jwt = require('jsonwebtoken');

/**
 * Générer un token JWT
 * @param {object} payload - Données à encoder
 * @returns {string} Token JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Vérifier un token JWT
 * @param {string} token - Token à vérifier
 * @returns {object} Données du token décodé
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
};

module.exports = {
  generateToken,
  verifyToken
};
