/**
 * Configuration de l'application Express
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176'
];
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

// ==================== MIDDLEWARE ====================

// Logger HTTP
app.use(morgan('combined'));

// CORS - Autoriser les requêtes du frontend
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origine CORS non autorisée: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parser JSON et URL-encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== ROUTES ====================

// Routes d'authentification
app.use('/api/auth', require('./routes/authRoutes'));

// Routes des utilisateurs
app.use('/api/users', require('./routes/userRoutes'));

// Routes des documents
app.use('/api/documents', require('./routes/documentRoutes'));

// Routes du forum
app.use('/api/forum', require('./routes/forumRoutes'));

// Routes du tableau de bord
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Routes des notes
app.use('/api/notes', require('./routes/noteRoutes'));

// Routes des abonnements
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));

// ==================== GESTION DES ERREURS ====================

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Middleware de gestion des erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Le fichier doit faire 10 Mo maximum.'
    });
  }

  if (typeof err.message === 'string' && err.message.includes('Type de fichier non pris en charge')) {
    return res.status(400).json({
      success: false,
      message: 'Type de fichier non pris en charge.'
    });
  }
  
  const status = err.status || 500;
  const message = err.message || 'Erreur serveur interne';
  
  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { error: err })
  });
});

module.exports = app;
