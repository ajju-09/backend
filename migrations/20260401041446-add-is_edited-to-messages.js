"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "is_edited", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: "is_pin",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "is_edited");
  },
};
