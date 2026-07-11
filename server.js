/**
 * Serveur principal pour Étudia+
 * Point d'entrée de l'application backend
 */

require('dotenv').config();
const app = require('./src/app');
const { ensureDatabaseReady } = require('./src/config/bootstrapDatabase');

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    await ensureDatabaseReady();

    server = app.listen(PORT, () => {
      console.log(`✅ Serveur Étudia+ démarré sur le port ${PORT}`);
      console.log(`📚 Environnement: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Démarrage annulé: PostgreSQL indisponible ou mal configuré.');
    console.error('❌ Détail:', error.message || error);
    process.exit(1);
  }
};

startServer();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  if (server) {
    server.close(() => process.exit(1));
    return;
  }
  process.exit(1);
});

module.exports = server;
