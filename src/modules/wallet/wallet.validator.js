const { z } = require('zod');

const topupSchema = {
  body: z.object({
    amount: z.number().positive('Top-up amount must be greater than zero'),
  }),
};

const statementQuerySchema = {
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
};

module.exports = { topupSchema, statementQuerySchema };
