"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("chats", "is_blocked");
    await queryInterface.removeColumn("chats", "is_pin");
    await queryInterface.removeColumn("chats", "is_muted");
    await queryInterface.removeColumn("chats", "isDeleted");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("chats", "is_blocked", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("chats", "is_pin", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("chats", "is_muted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("chats", "isDeleted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
};
