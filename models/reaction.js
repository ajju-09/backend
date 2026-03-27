"use strict";

module.exports = (sequelize, DataTypes) => {
  const Reaction = sequelize.define(
    "Reaction",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      msg_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      emoji: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "reactions",
      freezeTableName: true,
    },
  );

  Reaction.associate = (models) => {
    Reaction.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "reactor",
    });

    Reaction.belongsTo(models.Message, {
      foreignKey: "msg_id",
    });
  };

  return Reaction;
};
