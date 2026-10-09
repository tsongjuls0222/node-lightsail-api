import { ValidationError } from '../errors.js';

// Validates req.body / req.query / req.params against zod schemas and puts
// the parsed values on req.validated (Express 5 makes req.query read-only).
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const [location, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[location]);
      if (result.success) {
        validated[location] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        details.push({ location, field: issue.path.join('.') || undefined, message: issue.message });
      }
    }

    if (details.length > 0) throw new ValidationError(details);
    req.validated = validated;
    next();
  };
}
