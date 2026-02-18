"use strict";

module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define(
    "Chat",
    {
      user_one: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_two: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    },
  );

  Chat.associate = (models) => {
    Chat.belongsTo(models.User, {
      foreignKey: "user_one",
      as: "UserOne",
    });

    Chat.belongsTo(models.User, {
      foreignKey: "user_two",
      as: "UserTwo",
    });

    Chat.hasMany(models.Message, {
      foreignKey: "chat_id",
    });
  };

  return Chat;
};
