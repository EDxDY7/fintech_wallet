const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class Order extends Model { };
Order.init({
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
    totalAmount: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        field: 'total_amount',
    },
    status: {
        type: DataTypes.ENUM('CREATED', 'PAID', 'FAILED', 'CANCELLED'),
        defaultValue: 'CREATED',
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
    modelName: "Order"
});

module.exports = Order;