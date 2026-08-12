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
      const {
  title,
  courseName,
  folderName,
  color,
  sheetType,
  sourcePdf
} = req.body;

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
  folderName: folderName || 'Sans dossier',
  color: color || '#0d6efd',
  sheetType: sheetType || 'lined',
  sourcePdf: sourcePdf || null
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
  static async toggleFavorite(req, res) {
  try {
    const notebookId = Number(req.params.id);
    const { isFavorite } = req.body;

    if (typeof isFavorite !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Valeur de favori invalide'
      });
    }

    const notebook = await Note.updateNotebook(
      req.user.id,
      notebookId,
      { isFavorite }
    );

    if (!notebook) {
      return res.status(404).json({
        success: false,
        message: 'Cahier introuvable'
      });
    }

    return res.json({
      success: true,
      data: { notebook }
    });
  } catch (error) {
    console.error('Erreur favori cahier:', error);

    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du favori'
    });
  }
}

static async toggleTrash(req, res) {
  try {
    const notebookId = Number(req.params.id);
    const { isTrashed } = req.body;

    if (typeof isTrashed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Valeur de corbeille invalide'
      });
    }

    const notebook = await Note.updateNotebook(
      req.user.id,
      notebookId,
      { isTrashed }
    );

    if (!notebook) {
      return res.status(404).json({
        success: false,
        message: 'Cahier introuvable'
      });
    }

    return res.json({
      success: true,
      data: { notebook }
    });
  } catch (error) {
    console.error('Erreur corbeille cahier:', error);

    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la corbeille'
    });
  }
}

static async moveFolder(req, res) {
  try {
    const notebookId = Number(req.params.id);
    const { folderName } = req.body;

    if (
      typeof folderName !== 'string' ||
      !folderName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Nom de dossier requis'
      });
    }

    const notebook = await Note.updateNotebook(
      req.user.id,
      notebookId,
      {
        folderName: folderName.trim()
      }
    );

    if (!notebook) {
      return res.status(404).json({
        success: false,
        message: 'Cahier introuvable'
      });
    }

    return res.json({
      success: true,
      data: { notebook }
    });
  } catch (error) {
    console.error('Erreur déplacement cahier:', error);

    return res.status(500).json({
      success: false,
      message: 'Erreur lors du déplacement du cahier'
    });
  }
}

static async renameFolder(req, res) {
  try {
    const {
      sourceFolderName,
      targetFolderName
    } = req.body;

    if (
      !sourceFolderName?.trim() ||
      !targetFolderName?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Les deux noms de dossier sont requis'
      });
    }

    const notebooks = await Note.renameFolder(
      req.user.id,
      sourceFolderName.trim(),
      targetFolderName.trim()
    );

    return res.json({
      success: true,
      data: { notebooks }
    });
  } catch (error) {
    console.error('Erreur renommage dossier:', error);

    return res.status(500).json({
      success: false,
      message: 'Erreur lors du renommage du dossier'
    });
  }
}

static async deleteFolder(req, res) {
  try {
    const {
      folderName,
      targetFolderName
    } = req.body;

    if (
      !folderName?.trim() ||
      !targetFolderName?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Dossier source et dossier de destination requis'
      });
    }

    if (
      folderName.trim() ===
      targetFolderName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Le dossier de destination doit être différent'
      });
    }

    const notebooks = await Note.deleteFolder(
      req.user.id,
      folderName.trim(),
      targetFolderName.trim()
    );

    return res.json({
      success: true,
      data: { notebooks }
    });
  } catch (error) {
    console.error('Erreur suppression dossier:', error);

    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du dossier'
    });
  }
}

static async listFolders(req, res) {
  try {
    const folders = await Note.listFolders(
      req.user.id
    );

    return res.json({
      success: true,
      data: { folders }
    });
  } catch (error) {
    console.error(
      'Erreur récupération dossiers:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la récupération des dossiers'
    });
  }
}

static async createFolder(req, res) {
  try {
    const { name } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Nom de dossier requis'
      });
    }

    const folder = await Note.createFolder(
      req.user.id,
      name.trim()
    );

    return res.status(201).json({
      success: true,
      data: { folder }
    });
  } catch (error) {
    console.error(
      'Erreur création dossier:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la création du dossier'
    });
  }
}

  static async deletePage(req, res) {
  try {
    const notebook = await Note.deletePage(
      req.user.id,
      Number(req.params.id),
      Number(req.params.pageId)
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

    console.error('Erreur suppression page:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la page'
    });

  }
}

}

module.exports = NoteController;