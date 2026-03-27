"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chats", "last_message", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "user_two",
    });

    await queryInterface.addColumn("chats", "last_message_time", {
      type: Sequelize.DATE,
      defaultValue: null,
      allowNull: true,
      after: "last_message",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("chats", "last_message");
    await queryInterface.removeColumn("chats", "last_message_time");
  },
};
