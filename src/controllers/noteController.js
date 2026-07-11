const Note = require('../models/Note');

class NoteController {
  static async listNotebooks(req, res) {
    try {
      const notebooks = await Note.listByUser(req.user.id, {
        search: req.query.search,
        isFavorite: req.query.favorite === 'true' ? true : undefined,
        isTrashed: req.query.trashed === 'true' ? true : req.query.trashed === 'false' ? false : undefined
      });

      res.json({
        success: true,
        data: { notebooks }
      });
    } catch (error) {
      console.error('Erreur recuperation notes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recuperation des cahiers'
      });
    }
  }

  static async createNotebook(req, res) {
    try {
      const { title, courseName, color, sheetType } = req.body;

      if (!title || !courseName) {
        return res.status(400).json({
          success: false,
          message: 'Titre et cours associe requis'
        });
      }

      const notebook = await Note.createNotebook({
        userId: req.user.id,
        title,
        courseName,
        color: color || '#0d6efd',
        sheetType: sheetType || 'lined'
      });

      res.status(201).json({
        success: true,
        data: { notebook }
      });
    } catch (error) {
      console.error('Erreur creation cahier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la creation du cahier'
      });
    }
  }

  static async getNotebook(req, res) {
    try {
      const notebook = await Note.findNotebookById(req.user.id, Number(req.params.id));

      if (!notebook) {
        return res.status(404).json({
          success: false,
          message: 'Cahier introuvable'
        });
      }

      res.json({
        success: true,
        data: { notebook }
      });
    } catch (error) {
      console.error('Erreur detail cahier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recuperation du cahier'
      });
    }
  }

  static async updateNotebook(req, res) {
    try {
      const notebook = await Note.updateNotebook(req.user.id, Number(req.params.id), req.body || {});

      if (!notebook) {
        return res.status(404).json({
          success: false,
          message: 'Cahier introuvable'
        });
      }

      res.json({
        success: true,
        data: { notebook }
      });
    } catch (error) {
      console.error('Erreur mise a jour cahier:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise a jour du cahier'
      });
    }
  }

  static async createPage(req, res) {
    try {
      const page = await Note.createPage(req.user.id, Number(req.params.id), req.body || {});

      if (!page) {
        return res.status(404).json({
          success: false,
          message: 'Cahier introuvable'
        });
      }

      res.status(201).json({
        success: true,
        data: { page }
      });
    } catch (error) {
      console.error('Erreur creation page:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la creation de la page'
      });
    }
  }

  static async updatePage(req, res) {
    try {
      const notebook = await Note.updatePage(
        req.user.id,
        Number(req.params.id),
        Number(req.params.pageId),
        req.body || {}
      );

      if (!notebook) {
        return res.status(404).json({
          success: false,
          message: 'Page introuvable'
        });
      }

      res.json({
        success: true,
        data: { notebook }
      });
    } catch (error) {
      console.error('Erreur sauvegarde page:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la sauvegarde de la page'
      });
    }
  }
}

module.exports = NoteController;