"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plans", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM("Free", "Premium"),
        allowNull: false,
        defaultValue: "Free",
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      price_id: {
        type: Sequelize.STRING(255),
        defaultValue: null,
        allowNul: true,
      },
      duration_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      daily_message_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      file_sharing_enable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      ads_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      priority_delivery: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      custom_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("plans");
  },
};
