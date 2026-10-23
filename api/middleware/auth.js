const crypto = require('crypto');

/**
 * Middleware d'authentification simple par clé API.
 * Si API_KEY est défini dans l'environnement, toutes les routes protégées
 * requièrent l'en-tête X-API-Key correspondant.
 * En développement sans API_KEY, le middleware laisse passer (rétrocompatible).
 */
function requireApiKey(req, res, next) {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    // Pas de clé configurée -> mode développement, autoriser
    return next();
  }

  const provided = req.header('x-api-key') || req.header('X-API-Key');

  if (!provided) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      details: 'Provide X-API-Key header'
    });
  }

  // Comparaison en temps constant pour éviter timing attacks
  const expected = Buffer.from(String(apiKey));
  const actual = Buffer.from(String(provided));

  if (expected.length !== actual.length) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  try {
    if (crypto.timingSafeEqual(expected, actual)) {
      return next();
    }
  } catch (e) {
    // ignore
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid API key'
  });
}

module.exports = { requireApiKey };
