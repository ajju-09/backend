"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    photo: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    otp_purpose: {
      type: DataTypes.ENUM("signup", "forgot_password"),
      allowNull: true,
      defaultValue: null,
    },
    otp: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    last_seen: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isLogin: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
    },
  });

  User.associate = (models) => {
    User.hasMany(models.Chat, {
      foreignKey: "user_one",
    });

    User.hasMany(models.Chat, {
      foreignKey: "user_two",
    });

    User.hasMany(models.Message, {
      foreignKey: "sender_id",
    });

    User.hasMany(models.ChatSetting, {
      foreignKey: "user_id",
    });

    User.hasMany(models.MessageSetting, {
      foreignKey: "user_id",
    });

    User.hasMany(models.Notification, {
      foreignKey: "sender_id",
    });

    User.hasMany(models.Notification, {
      foreignKey: "receiver_id",
    });

    User.hasMany(models.Subscription, {
      foreignKey: "user_id",
    });
  };

  return User;
};
