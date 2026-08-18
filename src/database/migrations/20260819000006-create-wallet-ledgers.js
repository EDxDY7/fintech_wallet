'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wallet_ledgers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      wallet_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'wallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.ENUM(
          'WALLET_TOPUP',
          'ORDER_PAYMENT',
          'WITHDRAWAL_REQUEST',
          'WITHDRAWAL_PROCESSED',
          'WITHDRAWAL_REVERSED',
          'REFUND'
        ),
        allowNull: false
      },
      entry_type: {
        type: Sequelize.ENUM('CREDIT', 'DEBIT'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false
      },
      opening_balance: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false
      },
      closing_balance: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false
      },
      reference_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      reference_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('SUCCESS', 'FAILED', 'PENDING'),
        defaultValue: 'SUCCESS',
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('wallet_ledgers', ['wallet_id']);
    await queryInterface.addIndex('wallet_ledgers', ['transaction_id'], { unique: true });
    await queryInterface.addIndex('wallet_ledgers', ['reference_type', 'reference_id']);
    await queryInterface.addIndex('wallet_ledgers', ['type']);
    await queryInterface.addIndex('wallet_ledgers', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wallet_ledgers');
  }
};
