'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('idempotency_keys', {
      key: {
        type: Sequelize.STRING(128),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      request_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      request_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED'),
        defaultValue: 'IN_PROGRESS',
        allowNull: false
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      response_body: {
        type: Sequelize.JSON,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
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

    await queryInterface.addIndex('idempotency_keys', ['expires_at']);
    await queryInterface.addIndex('idempotency_keys', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('idempotency_keys');
  }
};
