"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "image_url", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: "text"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "image_url");
  },
};
