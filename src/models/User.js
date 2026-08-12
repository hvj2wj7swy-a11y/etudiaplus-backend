/**
 * Modèle User - Gestion des utilisateurs
 */

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const USER_SELECT_FIELDS = `
  id,
  email,
  first_name,
  last_name,
  profile_photo_url,
  school,
  program,
  session,
  role,
  subscription_type,
  subscription_status,
  trial_start,
  trial_end,
  subscription_start,
  subscription_end,
  auto_renew,
  stripe_customer_id,
stripe_subscription_id,
  points,
  created_at,
  is_active
`;

const mapSubscriptionMetadata = (user) => {
  if (!user) return user;

  return {
    ...user,
    subscriptionType: user.subscription_type,
    subscriptionStatus: user.subscription_status,
    trialStart: user.trial_start,
    trialEnd: user.trial_end,
    subscriptionStartDate: user.subscription_start,
    subscriptionEndDate: user.subscription_end,
    autoRenew: user.auto_renew,
    stripeCustomerId: user.stripe_customer_id,
stripeSubscriptionId: user.stripe_subscription_id
  };
};

class User {
  /**
   * Créer un nouvel utilisateur
   */
  static async create(userData) {
    const { email, password, firstName, lastName, school, program, session } = userData;
    
    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    
    const text = `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        school,
        program,
        session,
        role,
        subscription_type,
        subscription_status,
        trial_start,
        trial_end,
        auto_renew
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'student', 'none', 'inactive', NULL, NULL, false)
      RETURNING ${USER_SELECT_FIELDS}
    `;
    
    const res = await query(text, [email, passwordHash, firstName, lastName, school, program, session]);
    return mapSubscriptionMetadata(res.rows[0]);
  }

  /**
   * Trouver un utilisateur par email
   */
  static async findByEmail(email) {
    const text = 'SELECT * FROM users WHERE email = $1';
    const res = await query(text, [email]);
    return res.rows[0];
  }

  /**
   * Trouver un utilisateur par ID
   */
  static async findById(id) {
    await this.syncSubscriptionStatus(id);

    const text = `SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = $1`;
    const res = await query(text, [id]);
    return mapSubscriptionMetadata(res.rows[0]);
  }

  /**
   * Synchroniser l'état de l'abonnement selon les dates
   */
  static async syncSubscriptionStatus(userId) {
    const text = `
      UPDATE users
      SET
        subscription_end = CASE
          WHEN subscription_type = 'monthly' AND auto_renew = true AND subscription_end IS NOT NULL AND subscription_end < CURRENT_TIMESTAMP
            THEN CURRENT_TIMESTAMP + INTERVAL '1 month'
          WHEN subscription_type = 'annual' AND auto_renew = true AND subscription_end IS NOT NULL AND subscription_end < CURRENT_TIMESTAMP
            THEN CURRENT_TIMESTAMP + INTERVAL '1 year'
          ELSE subscription_end
        END,
        subscription_status = CASE
          WHEN role = 'admin' THEN 'active'
          WHEN subscription_type = 'trial' AND trial_end IS NOT NULL AND trial_end < CURRENT_TIMESTAMP THEN 'expired'
          WHEN subscription_type IN ('monthly', 'annual') AND subscription_end IS NOT NULL AND subscription_end < CURRENT_TIMESTAMP AND auto_renew = false THEN 'expired'
          WHEN subscription_type IN ('monthly', 'annual') AND auto_renew = true THEN 'active'
          ELSE subscription_status
        END
      WHERE id = $1
        AND (
          (role = 'admin' AND subscription_status <> 'active')
          OR (subscription_type = 'trial' AND trial_end IS NOT NULL AND trial_end < CURRENT_TIMESTAMP AND subscription_status <> 'expired')
          OR (subscription_type IN ('monthly', 'annual') AND auto_renew = true AND subscription_end IS NOT NULL AND subscription_end < CURRENT_TIMESTAMP)
          OR (subscription_type IN ('monthly', 'annual') AND auto_renew = false AND subscription_end IS NOT NULL AND subscription_end < CURRENT_TIMESTAMP AND subscription_status <> 'expired')
          OR (subscription_type IN ('monthly', 'annual') AND auto_renew = true AND subscription_status <> 'active')
        )
    `;

    await query(text, [userId]);
  }

  /**
   * Activer un abonnement payant
   */
  static async activatePaidSubscription(userId, planType) {
    const normalizedPlan = planType === 'annual' ? 'annual' : 'monthly';
    const durationInterval = normalizedPlan === 'annual' ? '1 year' : '1 month';

    const text = `
      UPDATE users
      SET
        subscription_type = $2,
        subscription_status = 'active',
        subscription_start = CURRENT_TIMESTAMP,
        subscription_end = CURRENT_TIMESTAMP + ($3)::interval,
        auto_renew = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${USER_SELECT_FIELDS}
    `;

    const res = await query(text, [userId, normalizedPlan, durationInterval]);
    return mapSubscriptionMetadata(res.rows[0]);
  }
static async saveStripeSubscription(
  userId,
  stripeCustomerId,
  stripeSubscriptionId
) {
  const text = `
    UPDATE users
    SET
      stripe_customer_id = $2,
      stripe_subscription_id = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [
    userId,
    stripeCustomerId || null,
    stripeSubscriptionId || null
  ]);

  return mapSubscriptionMetadata(
    res.rows[0] || null
  );
}

static async renewStripeSubscription(
  stripeSubscriptionId,
  subscriptionEndDate
) {
  const text = `
    UPDATE users
    SET
      subscription_status = 'active',
      subscription_end = $2,
      auto_renew = true,
      updated_at = CURRENT_TIMESTAMP
    WHERE stripe_subscription_id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [
    stripeSubscriptionId,
    subscriptionEndDate
  ]);

  return mapSubscriptionMetadata(
    res.rows[0] || null
  );
}

static async markStripePaymentFailed(
  stripeSubscriptionId
) {
  const text = `
    UPDATE users
    SET
      subscription_status = 'inactive',
      updated_at = CURRENT_TIMESTAMP
    WHERE stripe_subscription_id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [
    stripeSubscriptionId
  ]);

  return mapSubscriptionMetadata(
    res.rows[0] || null
  );
}

  /**
   * Résilier le renouvellement automatique
   */
  static async cancelAutoRenew(userId) {
    await this.syncSubscriptionStatus(userId);

    const text = `
      UPDATE users
      SET
        auto_renew = false,
        subscription_status = CASE
          WHEN subscription_type IN ('monthly', 'annual')
            AND subscription_end IS NOT NULL
            AND subscription_end >= CURRENT_TIMESTAMP
          THEN 'active'
          WHEN subscription_type IN ('monthly', 'annual')
            AND subscription_end IS NOT NULL
            AND subscription_end < CURRENT_TIMESTAMP
          THEN 'canceled'
          ELSE subscription_status
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${USER_SELECT_FIELDS}
    `;

    const res = await query(text, [userId]);
    return mapSubscriptionMetadata(res.rows[0]);
  }

  /**
 * Marquer un abonnement Stripe comme terminé
 */
  static async expireStripeSubscription(
  stripeSubscriptionId
) {
  const text = `
    UPDATE users
    SET
      subscription_status = 'expired',
      auto_renew = false,
      stripe_subscription_id = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE stripe_subscription_id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [
    stripeSubscriptionId
  ]);

  return mapSubscriptionMetadata(
    res.rows[0] || null
  );
}

  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateProfile(userId, updateData) {
    const { firstName, lastName, school, program, session, profilePhotoUrl } = updateData;
    
    const text = `
      UPDATE users 
      SET first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          school = COALESCE($4, school),
          program = COALESCE($5, program),
          session = COALESCE($6, session),
          profile_photo_url = COALESCE($7, profile_photo_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${USER_SELECT_FIELDS}
    `;
    
    const res = await query(text, [userId, firstName, lastName, school, program, session, profilePhotoUrl]);
return mapSubscriptionMetadata(res.rows[0]);
}

/**
 * Modifier un utilisateur depuis l'administration
 */
static async updateByAdmin(userId, updateData) {
  const {
    firstName,
    lastName,
    program,
    points
  } = updateData;

  const text = `
    UPDATE users
    SET
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      program = COALESCE($4, program),
      points = COALESCE($5, points),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [
    userId,
    firstName,
    lastName,
    program,
    points
  ]);

  return mapSubscriptionMetadata(res.rows[0]);
}

/**
 * Modifier le rôle d'un utilisateur
 */
static async updateRole(userId, role) {
  const text = `
    UPDATE users
    SET
      role = $2,
      subscription_status = CASE
        WHEN $2 = 'admin' THEN 'active'
        ELSE subscription_status
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [userId, role]);
  return mapSubscriptionMetadata(res.rows[0]);
}

/**
 * Activer ou désactiver un utilisateur
 */
static async updateStatus(userId, isActive) {
  const text = `
    UPDATE users
    SET
      is_active = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [userId, isActive]);
  return mapSubscriptionMetadata(res.rows[0]);
}

/**
 * Supprimer un utilisateur
 */
static async deleteById(userId) {
  const text = `
    DELETE FROM users
    WHERE id = $1
    RETURNING id
  `;

  const res = await query(text, [userId]);

  return res.rows[0] || null;
}

  /**
   * Vérifier le mot de passe
   */
  static async verifyPassword(plainPassword, passwordHash) {
    return await bcrypt.compare(plainPassword, passwordHash);
  }

/**
 * Obtenir tous les utilisateurs
 */
static async getAllUsers() {
  const text = `
    SELECT ${USER_SELECT_FIELDS}
    FROM users
    ORDER BY created_at DESC
  `;

  const res = await query(text);
  return res.rows.map(mapSubscriptionMetadata);
}


  /**
   * Obtenir les meilleurs contributeurs
   */
  static async getTopContributors(limit = 10) {
    const text = `
      SELECT u.id, u.first_name, u.last_name, u.profile_photo_url, u.points,
             COUNT(d.id) as documents_count
      FROM users u
      LEFT JOIN documents d ON u.id = d.uploaded_by AND d.status = 'approved'
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY u.points DESC, documents_count DESC
      LIMIT $1
    `;
    
    const res = await query(text, [limit]);
    return res.rows;
  }

  /**
   * Ajouter des points à un utilisateur
   */
  static async addPoints(userId, points) {
    const text = `
      UPDATE users
      SET points = points + $2
      WHERE id = $1
      RETURNING points
    `;
    
    const res = await query(text, [userId, points]);
    return res.rows[0];
  }
  /**
 * Enregistrer un jeton de réinitialisation de mot de passe
 */
static async savePasswordResetToken(
  userId,
  tokenHash,
  expiresAt
) {
  const text = `
    UPDATE users
    SET
      password_reset_token = $2,
      password_reset_expires = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;

  const res = await query(text, [
    userId,
    tokenHash,
    expiresAt
  ]);

  return res.rows[0] || null;
}

/**
 * Trouver l'utilisateur associé à un jeton
 * de réinitialisation encore valide
 */
static async findByPasswordResetToken(tokenHash) {
  const text = `
    SELECT *
    FROM users
    WHERE password_reset_token = $1
      AND password_reset_expires > CURRENT_TIMESTAMP
    LIMIT 1
  `;

  const res = await query(text, [tokenHash]);

  return res.rows[0] || null;
}

/**
 * Réinitialiser le mot de passe
 */
static async resetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(
    newPassword,
    10
  );

  const text = `
    UPDATE users
    SET
      password_hash = $2,
      password_reset_token = NULL,
      password_reset_expires = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING ${USER_SELECT_FIELDS}
  `;

  const res = await query(text, [
    userId,
    passwordHash
  ]);

  return mapSubscriptionMetadata(
    res.rows[0] || null
  );
}

/**
 * Effacer un jeton de réinitialisation
 */
static async clearPasswordResetToken(userId) {
  const text = `
    UPDATE users
    SET
      password_reset_token = NULL,
      password_reset_expires = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;

  const res = await query(text, [userId]);

  return res.rows[0] || null;
}
}


module.exports = User;
