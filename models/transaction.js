"use strict";

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sub_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stripe_payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      currency: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "INR",
      },
      status: {
        type: DataTypes.ENUM("Pending", "Success", "Failed", "Refunded"),
        allowNull: true,
        defaultValue: null,
      },
      invoice_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "transactions",
      timestamps: true,
    },
  );

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      foreignKey: "user_id",
    });

    Transaction.belongsTo(models.Plan, {
      foreignKey: "plan_id",
    });

    Transaction.belongsTo(models.Subscription, {
      foreignKey: "sub_id",
    });
  };

  return Transaction;
};
