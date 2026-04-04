"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "is_forwarded", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: "is_edited",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "is_forwarded");
  },
};
