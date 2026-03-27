"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("subscriptions", "status", {
      type: Sequelize.ENUM("Active", "Cancel"),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("subscriptions", "status", {
      type: Sequelize.ENUM("Active", "Expired"),
      allowNull: true,
      defaultValue: null,
    });
  },
};
