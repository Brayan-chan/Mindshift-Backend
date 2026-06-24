import { ApiError } from './error.middleware.js';

export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      return next(
        new ApiError(400, 'VALIDATION_ERROR', 'Invalid request payload', parsed.error.flatten()),
      );
    }

    req.validated = parsed.data;
    return next();
  };
}
