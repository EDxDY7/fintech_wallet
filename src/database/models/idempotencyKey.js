const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class IdempotencyKey extends Model { };
IdempotencyKey.init({
    key: {
        type: DataTypes.STRING(255),
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id',
    },
    requestPath: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'request_path',
    },
    requestHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'request_hash',
    },
    responseStatus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'response_status',
    },
    responseBody: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'response_body',
    },
    status: {
        type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED'),
        defaultValue: 'IN_PROGRESS',
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
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
    modelName: "IdempotencyKey"
});

module.exports = IdempotencyKey;