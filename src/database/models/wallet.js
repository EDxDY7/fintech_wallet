const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

class Wallet extends Model { };
Wallet.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: 'user_id',
    },
    availableBalance: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: 0.0000,
        field: 'available_balance',
    },
    lockedBalance: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: 0.0000,
        field: 'locked_balance',
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
    modelName: "Wallet"
});

module.exports = Wallet;