const { z } = require('zod');

const requestWithdrawalSchema = {
  body: z.object({
    amount: z.number().positive('Withdrawal amount must be greater than zero'),
  }),
};

module.exports = { requestWithdrawalSchema };
