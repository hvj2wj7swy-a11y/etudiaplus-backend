const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(email, resetUrl) {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY absente');
    console.log('Lien de réinitialisation :', resetUrl);
    return;
  }

  const { data, error } = await resend.emails.send({
  from:
    process.env.EMAIL_FROM ||
    'Étudia+ <onboarding@resend.dev>',
  to: email,
  subject: 'Réinitialisation de votre mot de passe',
  html: `
    <h2>Réinitialisation du mot de passe</h2>

    <p>
      Vous avez demandé la réinitialisation
      de votre mot de passe.
    </p>

    <p>
      <a href="${resetUrl}">
        Cliquez ici pour choisir un nouveau mot de passe
      </a>
    </p>

    <p>Ce lien expire dans 1 heure.</p>

    <p>
      Si vous n'êtes pas à l'origine de cette demande,
      ignorez simplement ce courriel.
    </p>
  `
});

if (error) {
  console.error('❌ Erreur Resend:', error);
  throw new Error(
    error.message || 'Impossible d’envoyer le courriel'
  );
}

console.log('✅ Courriel Resend envoyé:', data);
}

module.exports = {
  sendPasswordResetEmail
};