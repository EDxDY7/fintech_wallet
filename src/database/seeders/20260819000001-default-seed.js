'use strict';
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT email FROM users WHERE email IN ('admin@fintech.com', 'user@fintech.com')"
    );

    if (!existingUsers || existingUsers.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('Admin@123456', salt);
      const userPassword = await bcrypt.hash('User@123456', salt);

      const adminId = randomUUID();
      const userId = randomUUID();

      await queryInterface.bulkInsert('users', [
        {
          id: adminId,
          name: 'System Administrator',
          email: 'admin@fintech.com',
          password: adminPassword,
          role: 'admin',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: userId,
          name: 'John Doe',
          email: 'user@fintech.com',
          password: userPassword,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date()
        }
      ], {});

      await queryInterface.bulkInsert('wallets', [
        {
          id: randomUUID(),
          user_id: adminId,
          available_balance: 10000.0,
          locked_balance: 0.0,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          user_id: userId,
          available_balance: 1500.0,
          locked_balance: 0.0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ], {});
    }

    const [existingProducts] = await queryInterface.sequelize.query(
      "SELECT count(*) as count FROM products"
    );

    const productCount = existingProducts && existingProducts[0] ? (existingProducts[0].count || existingProducts[0]['count(*)'] || 0) : 0;

    if (parseInt(productCount, 10) === 0) {
      await queryInterface.bulkInsert('products', [
        {
          id: randomUUID(),
          name: 'Apple iPhone 15 Pro',
          price: 999.99,
          inventory_quantity: 10,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          name: 'MacBook Air M2',
          price: 1199.00,
          inventory_quantity: 5,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          name: 'Sony WH-1000XM5 Headphones',
          price: 349.50,
          inventory_quantity: 20,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          name: 'Logitech MX Master 3S Mouse',
          price: 99.00,
          inventory_quantity: 50,
          created_at: new Date(),
          updated_at: new Date()
        }
      ], {});
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('wallets', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
