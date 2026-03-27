"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("notifications", "chat_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "chats",
        key: "id",
      },
      after: "receiver_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("notifications", "chat_id");
  },
};
