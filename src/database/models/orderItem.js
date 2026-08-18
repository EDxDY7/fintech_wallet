const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class OrderItem extends Model { };
OrderItem.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'order_id',
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'product_id',
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    unitPrice: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        field: 'unit_price',
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
    modelName: "OrderItem"
});

module.exports = OrderItem;