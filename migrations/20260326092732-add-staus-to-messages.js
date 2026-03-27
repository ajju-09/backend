"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "status", {
      type: Sequelize.ENUM("sent", "delivered", "seen"),
      defaultValue: "sent",
      allowNull: true,
      after: "is_pin",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "status");
  },
};
