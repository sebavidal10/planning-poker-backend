const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        errors: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    next();
  } catch (err) {
    console.error('Unexpected validation error:', err);
    next(err);
  }
};

module.exports = validate;
