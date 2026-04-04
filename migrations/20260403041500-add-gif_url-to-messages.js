"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("messages", "gif_url", {
      type: Sequelize.STRING(2048),
      allowNull: true,
      defaultValue: null,
      after: "image_url",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("messages", "gif_url");
  },
};
