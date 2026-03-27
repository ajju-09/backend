"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "delete_for_all", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: "delete_for_receiver",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "delete_for_all");
  },
};
