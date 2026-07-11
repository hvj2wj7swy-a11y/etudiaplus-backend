/**
 * Contrôleur pour la gestion du forum
 */

const ForumQuestion = require('../models/ForumQuestion');
const ForumAnswer = require('../models/ForumAnswer');

class ForumController {
  /**
   * Créer une question
   */
  static async createQuestion(req, res) {
    try {
      const { title, content, category } = req.body;

      if (!title || !content || !category) {
        return res.status(400).json({
          success: false,
          message: 'Titre, contenu et catégorie requis'
        });
      }

      const question = await ForumQuestion.create({
        title,
        content,
        category,
        askedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Question créée',
        data: { question }
      });
    } catch (error) {
      console.error('Erreur création question:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la question'
      });
    }
  }

  /**
   * Obtenir les questions
   */
  static async getQuestions(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = parseInt(req.query.offset) || 0;

      const filters = {
        category: req.query.category,
        search: req.query.search,
        isResolved: req.query.isResolved !== undefined ? req.query.isResolved === 'true' : undefined
      };

      const questions = await ForumQuestion.getAll(filters, limit, offset);

      res.json({
        success: true,
        data: { questions }
      });
    } catch (error) {
      console.error('Erreur obtention questions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des questions'
      });
    }
  }

  /**
   * Obtenir une question
   */
  static async getQuestion(req, res) {
    try {
      const questionId = parseInt(req.params.id);

      const question = await ForumQuestion.findById(questionId);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question non trouvée'
        });
      }

      // Incrémenter le compteur de vues
      await ForumQuestion.incrementViewCount(questionId);

      res.json({
        success: true,
        data: { question }
      });
    } catch (error) {
      console.error('Erreur obtention question:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la question'
      });
    }
  }

  /**
   * Créer une réponse
   */
  static async createAnswer(req, res) {
    try {
      const questionId = parseInt(req.params.questionId);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Contenu de la réponse requis'
        });
      }

      // Vérifier que la question existe
      const question = await ForumQuestion.findById(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question non trouvée'
        });
      }

      const answer = await ForumAnswer.create({
        questionId,
        content,
        answeredBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Réponse créée',
        data: { answer }
      });
    } catch (error) {
      console.error('Erreur création réponse:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la réponse'
      });
    }
  }

  /**
   * Obtenir les réponses d'une question
   */
  static async getAnswers(req, res) {
    try {
      const questionId = parseInt(req.params.questionId);
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;

      const answers = await ForumAnswer.getAnswersByQuestion(questionId, limit, offset);

      res.json({
        success: true,
        data: { answers }
      });
    } catch (error) {
      console.error('Erreur obtention réponses:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des réponses'
      });
    }
  }

  /**
   * Voter sur une réponse
   */
  static async voteAnswer(req, res) {
    try {
      const answerId = parseInt(req.params.answerId);
      const { voteType } = req.body;

      if (!['up', 'down'].includes(voteType)) {
        return res.status(400).json({
          success: false,
          message: 'Type de vote invalide (up ou down)'
        });
      }

      const vote = await ForumAnswer.voteAnswer(answerId, req.user.id, voteType);

      res.json({
        success: true,
        message: 'Vote enregistré',
        data: { vote }
      });
    } catch (error) {
      console.error('Erreur vote:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du vote'
      });
    }
  }

  /**
   * Marquer une réponse comme solution
   */
  static async markAsSolution(req, res) {
    try {
      const answerId = parseInt(req.params.answerId);

      const solution = await ForumAnswer.markAsSolution(answerId);

      res.json({
        success: true,
        message: 'Réponse marquée comme solution',
        data: { solution }
      });
    } catch (error) {
      console.error('Erreur marquage solution:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage de la solution'
      });
    }
  }
}

module.exports = ForumController;
