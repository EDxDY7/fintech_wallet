const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class WalletLedger extends Model { };
WalletLedger.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    walletId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'wallet_id',
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'transaction_id',
    },
    type: {
        type: DataTypes.ENUM(
            'WALLET_TOPUP',
            'ORDER_PAYMENT',
            'WITHDRAWAL_REQUEST',
            'WITHDRAWAL_PROCESSED',
            'WITHDRAWAL_REVERSED',
            'REFUND'
        ),
        allowNull: false,
    },
    entryType: {
        type: DataTypes.ENUM('CREDIT', 'DEBIT'),
        allowNull: false,
        field: 'entry_type',
    },
    amount: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
    },
    openingBalance: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        field: 'opening_balance',
    },
    closingBalance: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        field: 'closing_balance',
    },
    referenceType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'reference_type',
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'reference_id',
    },
    status: {
        type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
        defaultValue: 'SUCCESS',
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
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
    modelName: "WalletLedger"
});

module.exports = WalletLedger;