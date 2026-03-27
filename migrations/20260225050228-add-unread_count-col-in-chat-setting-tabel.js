"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chat_settings", "unread_count", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      after: "is_block",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("chat_settings", "unread_count");
  },
};
