const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class Withdrawal extends Model { };
Withdrawal.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
    },
    walletId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'wallet_id',
    },
    amount: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'REJECTED'),
        defaultValue: 'PENDING',
    },
    failureReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'failure_reason',
    },
    retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'retry_count',
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: "Withdrawal"
});

module.exports = Withdrawal;