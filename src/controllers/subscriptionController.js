const User = require('../models/User');

const SUBSCRIPTION_PLANS = [
  {
    id: 'trial',
    name: 'Essai gratuit',
    cadence: '30 jours',
    priceCents: 0,
    priceDisplay: '0 $ CAD',
    description: 'Essai gratuit de 30 jours, active automatiquement a l inscription.',
    isHighlight: false,
    savingsNote: ''
  },
  {
    id: 'monthly',
    name: 'Mensuel',
    cadence: '/mois',
    priceCents: 999,
    priceDisplay: '9,99 $ CAD',
    description: 'Renouvellement automatique. Resiliation possible a tout moment.',
    isHighlight: false,
    savingsNote: ''
  },
  {
    id: 'annual',
    name: 'Annuel',
    cadence: '/an',
    priceCents: 9000,
    priceDisplay: '90 $ CAD',
    description: 'Renouvellement automatique. Resiliation possible a tout moment.',
    isHighlight: true,
    savingsNote: 'Economisez environ 25 %'
  }
];

const toFrontendSubscription = (user) => ({
  subscriptionType: user.subscriptionType,
  subscriptionStatus: user.subscriptionStatus,
  trialStart: user.trialStart,
  trialEnd: user.trialEnd,
  subscriptionStartDate: user.subscriptionStartDate,
  subscriptionEndDate: user.subscriptionEndDate,
  autoRenew: user.autoRenew
});

class SubscriptionController {
  static async getPlans(req, res) {
    res.json({
      success: true,
      data: {
        currency: 'CAD',
        plans: SUBSCRIPTION_PLANS
      }
    });
  }

  static async getCurrent(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouve'
        });
      }

      return res.json({
        success: true,
        data: {
          subscription: toFrontendSubscription(user)
        }
      });
    } catch (error) {
      console.error('Erreur abonnement courant:', error);
      return res.status(500).json({
        success: false,
        message: 'Impossible de recuperer l abonnement'
      });
    }
  }

  static async createCheckoutSession(req, res) {
    try {
      const plan = String(req.body?.plan || '').toLowerCase().trim();
      if (!['monthly', 'annual'].includes(plan)) {
        return res.status(400).json({
          success: false,
          message: 'Plan invalide. Choisissez monthly ou annual.'
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouve'
        });
      }

      if (user.role === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Le compte administrateur n a pas besoin d abonnement payant.'
        });
      }

      const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
      const monthlyPriceId = String(process.env.STRIPE_MONTHLY_PRICE_ID || '').trim();
      const annualPriceId = String(process.env.STRIPE_ANNUAL_PRICE_ID || '').trim();

      if (!stripeSecret || (plan === 'monthly' && !monthlyPriceId) || (plan === 'annual' && !annualPriceId)) {
        const activatedUser = await User.activatePaidSubscription(req.user.id, plan);
        return res.json({
          success: true,
          message: 'Abonnement active en mode simulation (Stripe non configure).',
          data: {
            mode: 'simulated',
            user: activatedUser
          }
        });
      }

      return res.json({
        success: true,
        message: 'Configuration Stripe detectee. Creer ici une Checkout Session Stripe avec le SDK.',
        data: {
          mode: 'stripe_pending',
          plan,
          priceId: plan === 'monthly' ? monthlyPriceId : annualPriceId
        }
      });
    } catch (error) {
      console.error('Erreur creation checkout:', error);
      return res.status(500).json({
        success: false,
        message: 'Impossible de demarrer le paiement.'
      });
    }
  }

  static async cancel(req, res) {
    try {
      const user = await User.cancelAutoRenew(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouve'
        });
      }

      return res.json({
        success: true,
        message: 'Renouvellement automatique desactive. L acces premium reste actif jusqu a la date de fin.',
        data: {
          user
        }
      });
    } catch (error) {
      console.error('Erreur resiliation abonnement:', error);
      return res.status(500).json({
        success: false,
        message: 'Impossible de resilier l abonnement.'
      });
    }
  }
}

module.exports = SubscriptionController;
