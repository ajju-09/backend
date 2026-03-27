"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "isDeleted",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "deletedAt");
  },
};
