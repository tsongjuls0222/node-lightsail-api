import { createHash, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError } from '../errors.js';

const sha256 = (value) => createHash('sha256').update(value).digest();

export function requireApiKey(expectedKey) {
  const expected = sha256(expectedKey);

  return (req, res, next) => {
    const provided = req.get('X-API-Key');
    // hash first: timingSafeEqual needs equal-length buffers
    if (!provided || !timingSafeEqual(sha256(provided), expected)) {
      throw new UnauthorizedError();
    }
    next();
  };
}
