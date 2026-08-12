const User = require('../models/User');
  const Stripe = require('stripe');

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

      if (
  !stripeSecret ||
  (plan === 'monthly' && !monthlyPriceId) ||
  (plan === 'annual' && !annualPriceId)
) {
  return res.status(500).json({
    success: false,
    message: 'Stripe n’est pas correctement configuré.'
  });
}

const stripe = new Stripe(stripeSecret);

const priceId =
  plan === 'monthly'
    ? monthlyPriceId
    : annualPriceId;

const frontendUrl =
  String(
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',

  line_items: [
    {
      price: priceId,
      quantity: 1
    }
  ],

  customer_email: user.email,

  success_url:
    `${frontendUrl}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

  cancel_url:
    `${frontendUrl}/subscription?checkout=cancelled`,

  metadata: {
    userId: String(req.user.id),
    plan
  },

  subscription_data: {
  trial_period_days: 30,
  metadata: {
    userId: String(req.user.id),
    plan
  }
}
});

return res.json({
  success: true,
  message: 'Session Stripe créée.',
  data: {
    mode: 'stripe',
    url: session.url,
    sessionId: session.id
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

  static async webhook(req, res) {
  const stripeSecret =
    String(
      process.env.STRIPE_SECRET_KEY || ''
    ).trim()

  const webhookSecret =
    String(
      process.env.STRIPE_WEBHOOK_SECRET || ''
    ).trim()

  if (!stripeSecret || !webhookSecret) {
    return res.status(500).json({
      success: false,
      message: 'Webhook Stripe non configuré.'
    })
  }

  const stripe = new Stripe(stripeSecret)

  let event

  try {
    const signature =
      req.headers['stripe-signature']

    event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      )
  } catch (error) {
    console.error(
      'Signature webhook Stripe invalide:',
      error.message
    )

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
  const session = event.data.object

  const userId =
    Number(session.metadata?.userId)

  const plan =
    session.metadata?.plan

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null

  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null

  if (
    userId &&
    ['monthly', 'annual'].includes(plan)
  ) {
    await User.activatePaidSubscription(
      userId,
      plan
    )

    await User.saveStripeSubscription(
      userId,
      stripeCustomerId,
      stripeSubscriptionId
    )
  }

  break
}

      case 'invoice.paid': {
  const invoice = event.data.object

  const stripeSubscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id || null

  if (stripeSubscriptionId) {
    const stripeSubscription =
      await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      )

    const periodEnd =
      stripeSubscription.items?.data?.[0]
        ?.current_period_end

    if (periodEnd) {
      const subscriptionEndDate =
        new Date(periodEnd * 1000)

      await User.renewStripeSubscription(
        stripeSubscriptionId,
        subscriptionEndDate
      )
    }
  }

  console.log(
    'Renouvellement Stripe payé:',
    invoice.id
  )

  break
}

      case 'invoice.payment_failed': {
  const invoice = event.data.object

  console.log(
    'Paiement Stripe échoué:',
    invoice.id
  )

  break
}

case 'customer.subscription.updated': {
  const subscription = event.data.object

  const stripeSubscriptionId = subscription.id

  const periodEnd =
    subscription.items?.data?.[0]
      ?.current_period_end

  if (
    periodEnd &&
    subscription.cancel_at_period_end !== true
  ) {
    const subscriptionEndDate =
      new Date(periodEnd * 1000)

    await User.renewStripeSubscription(
      stripeSubscriptionId,
      subscriptionEndDate
    )
  }

  console.log(
    'Abonnement Stripe mis à jour:',
    stripeSubscriptionId,
    subscription.status,
    'Résiliation programmée:',
    subscription.cancel_at_period_end
  )

  break
}

      case 'customer.subscription.deleted': {
  const subscription = event.data.object

  const updatedUser =
    await User.expireStripeSubscription(
      subscription.id
    )

  console.log(
    'Abonnement Stripe terminé:',
    subscription.id,
    updatedUser?.id || 'utilisateur non trouvé'
  )

  break
}

      default:
        console.log(
          'Événement Stripe ignoré:',
          event.type
        )
    }

    return res.json({
      received: true
    })
  } catch (error) {
    console.error(
      'Erreur traitement webhook Stripe:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Erreur lors du traitement du webhook Stripe.'
    })
  }
}

  static async cancel(req, res) {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouve'
      })
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message:
          'Aucun abonnement Stripe actif n’est associé à ce compte.'
      })
    }

    const stripeSecret =
      String(
        process.env.STRIPE_SECRET_KEY || ''
      ).trim()

    if (!stripeSecret) {
      return res.status(500).json({
        success: false,
        message: 'Stripe n’est pas configuré.'
      })
    }

    const stripe = new Stripe(stripeSecret)

    await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: true
      }
    )

    const updatedUser =
      await User.cancelAutoRenew(req.user.id)

    return res.json({
      success: true,
      message:
        'Votre abonnement ne sera pas renouvelé. Vous conservez votre accès jusqu’à la fin de la période payée.',
      data: {
        user: updatedUser
      }
    })
  } catch (error) {
    console.error(
      'Erreur resiliation abonnement:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Impossible de resilier l abonnement.'
    })
  }
}
}
module.exports = SubscriptionController;
