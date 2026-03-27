"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "delete_for_sender", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: "is_pin",
    });

    await queryInterface.addColumn("messages", "delete_for_receiver", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: "delete_for_sender",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "delete_for_sender");
    await queryInterface.removeColumn("messages", "delete_for_receiver");
  },
};
