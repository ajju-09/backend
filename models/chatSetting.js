"use stricts";

module.exports = (sequelize, DataTypes) => {
  const ChatSetting = sequelize.define(
    "ChatSetting",
    {
      chat_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      is_pin: {
        type: DataTypes.BOOLEAN,
      },
      is_mute: {
        type: DataTypes.BOOLEAN,
      },
      is_block: {
        type: DataTypes.BOOLEAN,
      },
      unread_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_delete: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      tableName: "chat_settings",
    },
  );

  ChatSetting.associate = (models) => {
    ChatSetting.belongsTo(models.Chat, {
      foreignKey: "chat_id",
    });

    ChatSetting.belongsTo(models.User, {
      foreignKey: "user_id",
    });
  };

  return ChatSetting;
};
