"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chat_settings", "lastSeenMsgId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "is_block",
    });

    await queryInterface.addColumn("chat_settings", "lastSeen", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "lastSeenMsgId",
    });

    await queryInterface.addColumn("chat_settings", "unread_count", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "lastSeen",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("chat_settings", "lastSeenMsgId");
    await queryInterface.removeColumn("chat_settings", "lastSeen");
    await queryInterface.removeColumn("chat_settings", "unread_count");
  },
};
