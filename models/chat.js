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
      is_blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_pin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_muted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
    },
  );

  Chat.associate = (models) => {
    Chat.belongsTo(models.User, {
      foreignKey: "user_one",
    });

    Chat.belongsTo(models.User, {
      foreignKey: "user_two",
    });
  };

  return Chat;
};
