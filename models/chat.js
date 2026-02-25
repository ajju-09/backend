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
      last_message: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_message_time: {
        type: DataTypes.DATE,
        defaultValue: null,
        allowNull: true,
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

    Chat.hasMany(models.ChatSetting, {
      foreignKey: "chat_id",
      onDelete: "CASCADE",
    });

    Chat.hasMany(models.MessageSetting, {
      foreignKey: "chat_id",
    });
  };

  return Chat;
};
