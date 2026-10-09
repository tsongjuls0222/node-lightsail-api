const { createHash, timingSafeEqual } = require('node:crypto');
const HttpError = require('../utils/HttpError');

const sha256 = (value) => createHash('sha256').update(value).digest();

function requireApiKey(expectedKey) {
  const expected = sha256(expectedKey);

  return (req, res, next) => {
    const provided = req.get('X-API-Key');
    // hash first: timingSafeEqual needs equal-length buffers
    if (!provided || !timingSafeEqual(sha256(provided), expected)) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Missing or invalid X-API-Key header'));
    }
    next();
  };
}

module.exports = requireApiKey;
