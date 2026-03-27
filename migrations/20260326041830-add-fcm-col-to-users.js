"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "fcm_token", {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      after: "isLogin",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "fcm_token");
  },
};
