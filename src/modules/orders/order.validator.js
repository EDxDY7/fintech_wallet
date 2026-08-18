const { z } = require('zod');

const createProductSchema = {
  body: z.object({
    name: z.string().min(2, 'Product name is required'),
    price: z.number().positive('Price must be greater than zero'),
    inventoryQuantity: z.number().int().nonnegative('Inventory cannot be negative'),
  }),
};

const createOrderSchema = {
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid Product UUID'),
          quantity: z.number().int().positive('Quantity must be at least 1'),
        })
      )
      .min(1, 'Order must contain at least one item'),
  }),
};

module.exports = { createProductSchema, createOrderSchema };
