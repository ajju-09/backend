"use strict";

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
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
      title: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      seen: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      msg_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "notifications",
      freezeTableName: true,
    },
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: "sender_id",
      as: "otheruser",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Notification.belongsTo(models.User, {
      foreignKey: "receiver_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Notification.belongsTo(models.Chat, {
      foreignKey: "chat_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    Notification.belongsTo(models.Message, {
      foreignKey: "msg_id",
      as: "relatedMessage",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  };

  return Notification;
};
