"use strict";

module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    "Plan",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.ENUM("Free", "Premium"),
        allowNull: false,
        defaultValue: "Free",
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      duration_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      daily_message_limit: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      file_sharing_enable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ads_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      priority_delivery: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      custom_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: "plans",
      timestamps: true,
    },
  );

  Plan.associate = (models) => {
    Plan.hasMany(models.Subscription, {
      foreignKey: "plan_id",
    });

    Plan.hasMany(models.Transaction, {
      foreignKey: "plan_id",
    });
  };

  return Plan;
};
