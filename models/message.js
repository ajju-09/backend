"use strict";

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
    {
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      chat_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      text: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      reply_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_pin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("sent", "delivered", "seen"),
        defaultValue: "sent",
      },
      delete_for_all: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_edited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
      timestamp: true,
      tableName: "messages",
      freezeTableName: true,
    },
  );

  Message.associate = (models) => {
    Message.belongsTo(models.User, {
      foreignKey: "sender_id",
      as: "sender",
    });

    Message.belongsTo(models.Chat, {
      foreignKey: "chat_id",
    });

    Message.belongsTo(models.Message, {
      foreignKey: "reply_to",
      as: "replyMessage",
    });

    Message.hasMany(models.MessageSetting, {
      foreignKey: "msg_id",
      as: "setting",
    });

    Message.hasMany(models.Reaction, {
      foreignKey: "msg_id",
      as: "reactions",
    });
  };

  return Message;
};
