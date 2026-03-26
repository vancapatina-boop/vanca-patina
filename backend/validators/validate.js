const { ZodError } = require("zod");

/**
 * Validates request parts with Zod and replaces req[source] with the parsed value.
 * @param {import("zod").ZodTypeAny} schema
 * @param {keyof Express.Request} [source='body']
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const value = req[source] ?? {};
      const parsed = schema.parse(value);
      req[source] = parsed;
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next({
          statusCode: 400,
          message: "Validation error",
          issues: err.issues,
        });
      }
      return next(err);
    }
  };
}

module.exports = validate;

