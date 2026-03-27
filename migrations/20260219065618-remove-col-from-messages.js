"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "is_send");
    await queryInterface.removeColumn("messages", "is_received");
    await queryInterface.removeColumn("messages", "is_read");
    await queryInterface.removeColumn("messages", "is_star");
    await queryInterface.removeColumn("messages", "delete_for_sender");
    await queryInterface.removeColumn("messages", "delete_for_receiver");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "is_send", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("messages", "is_received", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("messages", "is_read", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("messages", "is_star", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("messages", "delete_for_sender", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("messages", "delete_for_receiver", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },
};
