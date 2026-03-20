"use stricts";

module.exports = (sequelize, Datatypes) => {
  const MessageSetting = sequelize.define(
    "MessageSetting",
    {
      msg_id: {
        type: Datatypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: Datatypes.INTEGER,
        allowNull: false,
      },
      chat_id: {
        type: Datatypes.INTEGER,
        allowNull: false,
      },
      is_star: {
        type: Datatypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      delete_for_me: {
        type: Datatypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "message_settings",
      freezeTableName: true,
    },
  );

  MessageSetting.associate = (models) => {
    MessageSetting.belongsTo(models.Message, {
      foreignKey: "msg_id",
    });

    MessageSetting.belongsTo(models.User, {
      foreignKey: "user_id",
    });

    MessageSetting.belongsTo(models.Chat, {
      foreignKey: "chat_id",
    });
  };

  return MessageSetting;
};
