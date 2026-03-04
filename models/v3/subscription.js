"use strict";

module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "Subscription",
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
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("Active", "Expired"),
        allowNull: true,
        defaultValue: null,
      },
      auto_renew: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      tableName: "subscriptions",
      timestamps: true,
    },
  );

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.User, {
      foreignKey: "user_id",
    });

    Subscription.belongsTo(models.Plan, {
      foreignKey: "plan_id",
    });
  };

  return Subscription;
};
