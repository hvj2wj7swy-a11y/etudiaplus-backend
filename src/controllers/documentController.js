/**
 * Contrôleur pour la gestion des documents
 */

const Document = require('../models/Document');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

class DocumentController {
  /**
   * Téléverser un document
   */
  static async uploadDocument(req, res) {
    try {
      const { title, description, school, program, courseCode, courseName } = req.body;

      if (!title || !school || !program || !courseCode) {
        return res.status(400).json({
          success: false,
          message: 'Titre, établissement, programme et code du cours requis'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier téléversé'
        });
      }

      // Créer le document
      const document = await Document.create({
        title,
        description,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        school,
        program,
        courseCode,
        courseName,
        uploadedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Document téléversé avec succès',
        data: { document }
      });
    } catch (error) {
      console.error('Erreur téléversement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du téléversement du document'
      });
    }
  }

  /**
   * Obtenir tous les documents
   */
  static async getAllDocuments(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = parseInt(req.query.offset) || 0;

      const filters = {
        status: req.query.status || 'approved',
        program: req.query.program,
        courseCode: req.query.courseCode,
        search: req.query.search
      };

      const documents = await Document.getAll(filters, limit, offset);

      res.json({
        success: true,
        data: { documents }
      });
    } catch (error) {
      console.error('Erreur obtention documents:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des documents'
      });
    }
  }

  /**
   * Obtenir un document
   */
  static async getDocument(req, res) {
    try {
      const documentId = parseInt(req.params.id);

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document non trouvé'
        });
      }

      // Incrémenter le compteur de téléchargements
      await Document.incrementDownloadCount(documentId);

      res.json({
        success: true,
        data: { document }
      });
    } catch (error) {
      console.error('Erreur obtention document:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du document'
      });
    }
  }

  /**
   * Évaluer un document
   */
  static async rateDocument(req, res) {
    try {
      const documentId = parseInt(req.params.id);
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Évaluation entre 1 et 5 requise'
        });
      }

      const docRating = await Document.addRating(documentId, req.user.id, rating, comment);

      res.json({
        success: true,
        message: 'Évaluation enregistrée',
        data: { rating: docRating }
      });
    } catch (error) {
      console.error('Erreur évaluation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement de l\'évaluation'
      });
    }
  }

  /**
   * Signaler un document
   */
  static async reportDocument(req, res) {
    try {
      const documentId = parseInt(req.params.id);
      const { reason, description } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Raison du signalement requise'
        });
      }

      const report = await Document.reportDocument(documentId, req.user.id, reason, description);

      res.json({
        success: true,
        message: 'Document signalé',
        data: { report }
      });
    } catch (error) {
      console.error('Erreur signalement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du signalement du document'
      });
    }
  }

  /**
   * Obtenir les documents d'un utilisateur
   */
  static async getUserDocuments(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = parseInt(req.query.offset) || 0;

      const documents = await Document.getUserDocuments(userId, limit, offset);

      res.json({
        success: true,
        data: { documents }
      });
    } catch (error) {
      console.error('Erreur documents utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des documents de l\'utilisateur'
      });
    }
  }
}

module.exports = DocumentController;
